import { FastifyTemplateService } from '@tsoa/runtime/fastify';
import { TsoaResponse } from '@tsoa/runtime/index';
import { expect } from 'chai';
import Fastify, { FastifyInstance } from 'fastify';
import 'mocha';
import { Readable } from 'stream';
import { AddressInfo, connect } from 'net';
import { setImmediate as nextTurn, setTimeout as sleep } from 'timers/promises';
import { resetState, stateOf } from '../fixtures/controllers/middlewaresFastifyController';
import { sharedAuthError } from '../fixtures/fastify/authentication';
import { RegisterRoutes } from '../fixtures/fastify/routes';

const config = { noImplicitAdditionalProperties: 'throw-on-extras', bodyCoercion: true } as const;

function respondWith(app: FastifyInstance, status: number | undefined, data: unknown, headers?: Record<string, string>) {
  const service = new FastifyTemplateService({}, config);
  class ResponseController {
    response(res: TsoaResponse<200, unknown>) {
      return (res as unknown as (s: number | undefined, d: unknown, h?: Record<string, string>) => Promise<void>)(status, data, headers);
    }
  }
  app.get('/', async (request, reply) => {
    const validatedArgs = service.getValidatedArgs({ args: { res: { in: 'res', name: 'res' } }, request, reply });
    await service.apiHandler({ methodName: 'response', controller: new ResponseController(), request, reply, validatedArgs });
    return reply;
  });
}

describe('Fastify responses and authentication', () => {
  let app: FastifyInstance;
  beforeEach(() => {
    app = Fastify();
  });
  afterEach(async () => {
    await app.close();
    resetState();
  });

  describe('binary payloads under a non-JSON content type', () => {
    const bytes = [137, 80, 78, 71];
    for (const [label, make] of [
      ['Uint8Array', () => new Uint8Array(bytes)],
      ['ArrayBuffer', () => new Uint8Array(bytes).buffer],
      ['DataView', () => new DataView(new Uint8Array(bytes).buffer)],
    ] as const) {
      it(`sends a ${label} as raw bytes`, async () => {
        respondWith(app, 200, make(), { 'Content-Type': 'image/png' });
        const response = await app.inject('/');
        expect(response.statusCode).to.equal(200);
        expect([...response.rawPayload]).to.deep.equal(bytes);
      });
    }

    it('sends only the viewed bytes of a Uint8Array subarray', async () => {
      respondWith(app, 200, new Uint8Array([0, ...bytes, 0]).subarray(1, 5), { 'Content-Type': 'image/png' });
      const response = await app.inject('/');
      expect([...response.rawPayload]).to.deep.equal(bytes);
    });

    it('sends a view over a SharedArrayBuffer as raw bytes', async () => {
      const shared = new Uint8Array(new SharedArrayBuffer(bytes.length + 2));
      shared.set(bytes, 1);
      respondWith(app, 200, shared.subarray(1, 5), { 'Content-Type': 'image/png' });
      const response = await app.inject('/');
      expect(response.statusCode).to.equal(200);
      expect([...response.rawPayload]).to.deep.equal(bytes);
    });

    it('sends a SharedArrayBuffer as raw bytes', async () => {
      const shared = new Uint8Array(new SharedArrayBuffer(bytes.length));
      shared.set(bytes);
      respondWith(app, 200, shared.buffer, { 'Content-Type': 'image/png' });
      const response = await app.inject('/');
      expect([...response.rawPayload]).to.deep.equal(bytes);
    });

    it('sends a web ReadableStream as raw bytes', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(bytes));
          controller.close();
        },
      });
      respondWith(app, 200, stream, { 'Content-Type': 'application/octet-stream' });
      const response = await app.inject('/');
      expect([...response.rawPayload]).to.deep.equal(bytes);
    });

    it('sends a Node Readable as raw bytes', async () => {
      respondWith(app, 200, Readable.from([Buffer.from(bytes)]), { 'Content-Type': 'application/octet-stream' });
      const response = await app.inject('/');
      expect([...response.rawPayload]).to.deep.equal(bytes);
    });

    it('still serializes a plain object under a non-JSON content type', async () => {
      respondWith(app, 200, { a: 1 }, { 'Content-Type': 'text/plain' });
      const response = await app.inject('/');
      expect(response.body).to.equal('{"a":1}');
    });
  });

  describe('empty results', () => {
    for (const status of [201, 202, 404]) {
      it(`sends an empty body for undefined with status ${status}`, async () => {
        respondWith(app, status, undefined);
        const response = await app.inject('/');
        expect(response.statusCode).to.equal(status);
        expect(response.body).to.equal('');
      });
    }

    it('answers 204 with an empty body when there is no status and no data', async () => {
      respondWith(app, undefined, undefined);
      const response = await app.inject('/');
      expect(response.statusCode).to.equal(204);
      expect(response.body).to.equal('');
    });

    it('sends JSON null for null under a JSON content type', async () => {
      respondWith(app, 200, null, { 'Content-Type': 'application/json' });
      const response = await app.inject('/');
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.equal('null');
      expect(response.json()).to.equal(null);
    });

    it('sends JSON null with 200 for null under a JSON content type and no status', async () => {
      respondWith(app, undefined, null, { 'Content-Type': 'application/json' });
      const response = await app.inject('/');
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.equal('null');
    });

    it('sends JSON null for null under a vendor JSON content type', async () => {
      respondWith(app, 202, null, { 'Content-Type': 'application/vnd.test+json' });
      const response = await app.inject('/');
      expect(response.statusCode).to.equal(202);
      expect(response.body).to.equal('null');
    });

    it('sends JSON null through a custom serializer only once', async () => {
      const service = new FastifyTemplateService({}, config);
      class NullController {
        response() {
          return null;
        }
      }
      app.get('/custom', async (request, reply) => {
        reply.header('Content-Type', 'application/json').serializer((payload: unknown) => JSON.stringify(payload));
        await service.apiHandler({ methodName: 'response', controller: new NullController(), request, reply, validatedArgs: [], successStatus: 200 });
        return reply;
      });
      const response = await app.inject('/custom');
      expect(response.body).to.equal('null');
    });

    it('sends an empty body for null without a content type', async () => {
      respondWith(app, 200, null);
      const response = await app.inject('/');
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.equal('');
    });
  });

  describe('authentication failures', () => {
    function captureErrors() {
      const seen: Array<Error & { status?: number; statusCode?: number; cause?: unknown }> = [];
      app.setErrorHandler((error, _request, reply) => {
        seen.push(error as Error);
        return reply.code((error as { statusCode?: number }).statusCode ?? 500).send({ message: (error as Error).message });
      });
      app.register(RegisterRoutes);
      return seen;
    }

    it('hands the rejected Error itself to the error handler', async () => {
      const seen = captureErrors();
      const response = await app.inject('/v1/SecurityTest/Koa?access_token=shared-error');
      expect(response.statusCode).to.equal(401);
      expect(seen).to.have.length(1);
      expect(seen[0]).to.equal(sharedAuthError);
      expect(seen[0].statusCode).to.equal(401);
    });

    it('hands the same Error instance on every request', async () => {
      const seen = captureErrors();
      await app.inject('/v1/SecurityTest/Koa?access_token=shared-error');
      const response = await app.inject('/v1/SecurityTest/Koa?access_token=shared-error');
      expect(response.statusCode).to.equal(401);
      expect(seen[1]).to.equal(sharedAuthError);
    });

    for (const [description, token, status] of [
      ['a frozen Error with a status', 'frozen-status', 403],
      ['a frozen Error with a statusCode', 'frozen-status-code', 403],
      ['an Error whose status is a getter', 'getter-status', 403],
      ['an Error with only a statusCode', 'status-code-only', 429],
    ] as const) {
      it(`passes on ${description} with its status`, async () => {
        const seen = captureErrors();
        const response = await app.inject(`/v1/SecurityTest/Koa?access_token=${token}`);
        expect(response.statusCode).to.equal(status);
        expect(response.json()).to.deep.equal({ message: 'api_key' });
        expect(seen[0]).to.be.instanceOf(Error);
        expect(seen[0].statusCode).to.equal(status);
      });
    }

    describe('authenticationError', () => {
      const service = new FastifyTemplateService({}, config);

      for (const [description, failure, status] of [
        ['a status below 400', Object.assign(new Error('x'), { status: 200 }), 401],
        ['a non-numeric status, falling back to statusCode', Object.assign(new Error('x'), { status: 'fail', statusCode: 403 }), 403],
        ['a status above 599', Object.assign(new Error('x'), { status: 600 }), 401],
        ['a valid status over a conflicting statusCode', Object.assign(new Error('x'), { status: 403, statusCode: 418 }), 403],
      ] as const) {
        it(`answers ${status} for ${description}`, () => {
          const error = service.authenticationError(failure);
          expect(error).to.equal(failure);
          expect(error.status).to.equal(status);
          expect(error.statusCode).to.equal(status);
        });
      }

      it('keeps a setter-backed status as an accessor', () => {
        let stored = 0;
        const failure = new Error('x');
        Object.defineProperty(failure, 'status', { get: () => stored, set: (value: number) => (stored = value), enumerable: false, configurable: true });
        const error = service.authenticationError(failure);
        expect(error).to.equal(failure);
        expect(stored).to.equal(401);
        expect(Object.getOwnPropertyDescriptor(failure, 'status')).to.have.property('set').that.is.a('function');
      });

      it('falls back to an inheriting object for a read-only status', () => {
        const failure = Object.defineProperty(new Error('x'), 'status', { value: 403, writable: false, configurable: false });
        const error = service.authenticationError(failure);
        expect(error).to.not.equal(failure);
        expect(Object.getPrototypeOf(error)).to.equal(failure);
        expect(error.status).to.equal(403);
        expect(error.statusCode).to.equal(403);
      });
    });

    it('wraps a non-Error rejection in an Error with the rejection as cause', async () => {
      const seen = captureErrors();
      const response = await app.inject('/v1/SecurityTest/Koa?access_token=bogus');
      expect(response.statusCode).to.equal(401);
      expect(seen[0]).to.be.instanceOf(Error);
      expect(seen[0].message).to.equal('api_key');
      expect(seen[0].cause).to.deep.equal({ message: 'api_key' });
    });

    it('uses a string rejection as the message and the cause', async () => {
      const seen = captureErrors();
      const response = await app.inject('/v1/SecurityTest/ApiKeyAndOauthOrAnonymous?tsoa=string-rejection');
      expect(response.statusCode).to.equal(401);
      expect(seen[0].message).to.equal('denied');
      expect(seen[0].cause).to.equal('denied');
    });
  });

  // The authentication hook returns `reply`, whose then() resolves once the response has ended or the
  // client has gone. Fastify skips the remaining preHandlers only in the first case, so the generated
  // routes also check before each later preHandler.
  describe('a response sent by authentication', () => {
    for (const [hook, token, status, body] of [
      ['onSend', 'ghi123456', 401, 'some custom response'],
      // A string without a content type skips preSerialization, so this case sends an object.
      ['preSerialization', 'send-object', 200, '{"value":"authentication"}'],
    ] as const) {
      it(`skips route middlewares while an asynchronous ${hook} hook is still running`, async () => {
        resetState();
        let calls = 0;
        app.addHook(hook, async (_request, _reply, payload) => {
          calls++;
          await nextTurn();
          await nextTurn();
          return payload;
        });
        app.register(RegisterRoutes);
        const response = await app.inject(`/v1/MiddlewareTestFastify/secured?access_token=${token}`);
        expect(response.statusCode).to.equal(status);
        expect(response.body).to.equal(body);
        expect(calls).to.equal(1);
        expect(stateOf('route')).to.equal(undefined);
        expect(stateOf('secured')).to.equal(undefined);
        expect(stateOf('securedController')).to.equal(undefined);
      });
    }

    for (const [hook, token] of [
      ['onSend', 'ghi123456'],
      ['preSerialization', 'send-object'],
    ] as const) {
      it(`skips route middlewares when the client disconnects during a slow ${hook} hook`, async () => {
        resetState();
        let hookDone!: () => void;
        const hookFinished = new Promise<void>(resolve => (hookDone = resolve));
        let entered!: () => void;
        const hookEntered = new Promise<void>(resolve => (entered = resolve));
        app.addHook(hook, async (_request, _reply, payload) => {
          entered();
          await sleep(100);
          hookDone();
          return payload;
        });
        app.register(RegisterRoutes);
        await app.listen({ port: 0, host: '127.0.0.1' });
        const { port } = app.server.address() as AddressInfo;
        const socket = connect(port, '127.0.0.1', () => {
          socket.write(`GET /v1/MiddlewareTestFastify/secured?access_token=${token} HTTP/1.1\r\nHost: localhost\r\n\r\n`);
        });
        socket.on('error', () => undefined);
        await hookEntered;
        socket.destroy();
        await hookFinished;
        await sleep(50);
        expect(stateOf('route')).to.equal(undefined);
        expect(stateOf('secured')).to.equal(undefined);
        expect(stateOf('securedController')).to.equal(undefined);
      });
    }

    it('runs route middlewares after successful authentication', async () => {
      resetState();
      app.register(RegisterRoutes);
      const response = await app.inject('/v1/MiddlewareTestFastify/secured?access_token=abc123456');
      expect(response.statusCode).to.equal(200);
      expect(stateOf('secured')).to.equal(true);
      expect(stateOf('securedController')).to.equal(true);
    });
  });
});
