import { Controller, TsoaResponse } from '@tsoa/runtime/index';
import { FastifyTemplateService } from '@tsoa/runtime/fastify';
import { expect } from 'chai';
import Fastify, { FastifyInstance } from 'fastify';
import { setImmediate as nextTurn } from 'timers/promises';
import { spy } from 'sinon';
import { SecurityTestController } from '../fixtures/controllers/securityController';
import { RegisterRoutes } from '../fixtures/fastify/routes';

const config = { noImplicitAdditionalProperties: 'throw-on-extras', bodyCoercion: true } as const;
type Responder = TsoaResponse<202 | 203, { value: string }>;

class ResponseController extends Controller {
  constructor(
    private readonly awaitResponse: boolean,
    private readonly fail: boolean,
  ) {
    super();
  }

  async response(res: Responder) {
    const completion = res(202, { value: 'first' });
    if (this.awaitResponse) await completion;
    if (this.fail) throw new Error('controller failed after responding');
    await res(203, { value: 'second' });
    return { value: 'third' };
  }
}

function addResponseRoute(app: FastifyInstance, controller: ResponseController) {
  const service = new FastifyTemplateService({}, config);
  app.get('/', async (request, reply) => {
    const validatedArgs = service.getValidatedArgs({ args: { res: { in: 'res', name: 'res' } }, request, reply });
    await service.apiHandler({ methodName: 'response', controller, request, reply, validatedArgs });
    return reply;
  });
}

describe('Fastify response lifecycle', () => {
  for (const hook of ['onSend', 'preSerialization'] as const) {
    describe(`with an asynchronous ${hook} hook`, () => {
      for (const [token, status, body] of [
        ['send-object', 200, { value: 'authentication' }],
        ['send-object-missing', 200, { value: 'authentication' }],
      ] as const) {
        it(`preserves the authentication response for ${token}`, async () => {
          const app = Fastify();
          app.addHook(hook, async (_request, _reply, payload) => {
            await nextTurn();
            return payload;
          });
          const controller = spy(SecurityTestController.prototype, 'GetWithOptionalSecurity');
          app.register(RegisterRoutes);
          try {
            const response = await app.inject(`/v1/SecurityTest/ApiKeyOrAnonymous?access_token=${token}`);
            expect(response.statusCode).to.equal(status);
            expect(response.json()).to.deep.equal(body);
            expect(controller.called).to.equal(false);
          } finally {
            controller.restore();
            await app.close();
          }
        });
      }

      for (const awaitResponse of [true, false]) {
        for (const fail of [true, false]) {
          it(`keeps the first response when ${awaitResponse ? 'awaiting' : 'not awaiting'} @Res and ${fail ? 'throwing' : 'returning'} afterward`, async () => {
            const app = Fastify();
            const payloads: unknown[] = [];
            app.addHook(hook, async (_request, _reply, payload) => {
              payloads.push(payload);
              await nextTurn();
              return payload;
            });
            addResponseRoute(app, new ResponseController(awaitResponse, fail));
            try {
              const response = await app.inject('/');
              expect(response.statusCode).to.equal(202);
              expect(response.json()).to.deep.equal({ value: 'first' });
              await nextTurn();
              expect(payloads).to.have.length(1);
            } finally {
              await app.close();
            }
          });
        }
      }

      it('lets Fastify recover when a response hook fails', async () => {
        const app = Fastify();
        app.addHook(hook, async (_request, reply, payload) => {
          await nextTurn();
          if (reply.statusCode === 202) throw new Error('response hook failed');
          return payload;
        });
        addResponseRoute(app, new ResponseController(true, false));
        try {
          const response = await app.inject('/');
          expect(response.statusCode).to.equal(500);
          expect(response.json().message).to.equal('response hook failed');
        } finally {
          await app.close();
        }
      });
    });
  }

  for (const [token, status, body] of [
    ['ghi123456', 401, 'some custom response'],
    ['send-empty', 200, ''],
  ] as const) {
    it(`preserves ${token} authentication output through onSend`, async () => {
      const app = Fastify();
      app.addHook('onSend', async (_request, _reply, payload) => {
        await nextTurn();
        return payload;
      });
      const controller = spy(SecurityTestController.prototype, 'GetWithApiForKoa');
      app.register(RegisterRoutes);
      try {
        const response = await app.inject(`/v1/SecurityTest/Koa?access_token=${token}`);
        expect(response.statusCode).to.equal(status);
        expect(response.body).to.equal(body);
        expect(controller.called).to.equal(false);
      } finally {
        controller.restore();
        await app.close();
      }
    });
  }

  it('allows native error handling after a synchronous send failure', async () => {
    const app = Fastify();
    const service = new FastifyTemplateService({}, config);
    class SerializationController {
      response(res: TsoaResponse<202, string>) {
        return res(202, 'first');
      }
    }
    app.get('/', async (request, reply) => {
      reply.type('text/plain').serializer(() => {
        throw new Error('serializer failed');
      });
      const validatedArgs = service.getValidatedArgs({ args: { res: { in: 'res', name: 'res' } }, request, reply });
      await service.apiHandler({ methodName: 'response', controller: new SerializationController(), request, reply, validatedArgs });
      return reply;
    });
    try {
      const response = await app.inject('/');
      expect(response.statusCode).to.equal(500);
      expect(response.json().message).to.equal('serializer failed');
    } finally {
      await app.close();
    }
  });

  it('keeps response ownership separate across concurrent requests', async () => {
    const app = Fastify();
    const service = new FastifyTemplateService({}, config);
    class ConcurrentController {
      async response(value: string, res: Responder) {
        void res(202, { value });
        await nextTurn();
        throw new Error('late controller failure');
      }
    }
    app.addHook('onSend', async (_request, _reply, payload) => {
      await nextTurn();
      return payload;
    });
    app.get<{ Params: { value: string } }>('/:value', async (request, reply) => {
      const [res] = service.getValidatedArgs({ args: { res: { in: 'res', name: 'res' } }, request, reply });
      await service.apiHandler({ methodName: 'response', controller: new ConcurrentController(), request, reply, validatedArgs: [request.params.value, res] });
      return reply;
    });
    try {
      const responses = await Promise.all(['one', 'two'].map(value => app.inject(`/${value}`)));
      expect(responses.map(response => response.statusCode)).to.deep.equal([202, 202]);
      expect(responses.map(response => response.json())).to.deep.equal([{ value: 'one' }, { value: 'two' }]);
    } finally {
      await app.close();
    }
  });
});
