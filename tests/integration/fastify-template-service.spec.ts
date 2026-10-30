import multipart from '@fastify/multipart';
import { Controller, TsoaResponse, ValidateError } from '@tsoa/runtime/index';
import { FastifyTemplateService } from '@tsoa/runtime/fastify';
import { KoaTemplateService } from '@tsoa/runtime/koa';
import { rejects } from 'assert';
import { expect } from 'chai';
import Fastify from 'fastify';
import Koa from 'koa';
import request from 'supertest';
import { Readable } from 'stream';
import { RegisterRoutes } from '../fixtures/fastify/routes';

const config = { noImplicitAdditionalProperties: 'throw-on-extras', bodyCoercion: true } as const;

class ResponseController extends Controller {
  private readonly data: unknown;
  private readonly status?: number;
  private readonly contentType?: string;

  constructor(data: unknown, status?: number, contentType?: string) {
    super();
    this.data = data;
    this.status = status;
    this.contentType = contentType;
  }

  response() {
    if (this.status) this.setStatus(this.status);
    if (this.contentType) this.setHeader('Content-Type', this.contentType);
    return this.data;
  }

  async twice(res: TsoaResponse<202, string>): Promise<string> {
    await res(202, 'first');
    await res(202, 'second');
    return 'third';
  }
}

describe('FastifyTemplateService', () => {
  for (const [name, data, status, contentType] of [
    ['null', null],
    ['undefined', undefined],
    ['null with explicit status', null, 202],
    ['undefined with explicit status', undefined, 200],
    ['null with unknown status', null, 299],
    ['false', false],
    ['zero', 0],
    ['JSON string', 'plain string', 200, 'application/json'],
    ['vendor JSON string', 'plain string', 200, 'application/vnd.test+json'],
    ['object under text/plain', { a: 1 }, 200, 'text/plain'],
    ['false under text/plain', false, 200, 'text/plain'],
    ['number under application/xml', 42, 200, 'application/xml'],
  ] as const) {
    it(`matches Koa status and response bytes for ${name}`, async () => {
      const koa = new Koa();
      const koaService = new KoaTemplateService({}, config);
      koa.use(context => koaService.apiHandler({ methodName: 'response', controller: new ResponseController(data, status, contentType), context, validatedArgs: [] }));
      const expected = await request(koa.callback())
        .get('/')
        .buffer(true)
        .parse((res, callback) => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', chunk => (text += chunk));
          res.on('end', () => callback(null, text));
        });

      const app = Fastify();
      const service = new FastifyTemplateService({}, config);
      app.get('/', async (request, reply) => {
        await service.apiHandler({ methodName: 'response', controller: new ResponseController(data, status, contentType), request, reply, validatedArgs: [] });
        return reply;
      });
      try {
        const actual = await app.inject('/');
        expect(actual.statusCode).to.equal(expected.status);
        expect(actual.body).to.equal(expected.body || '');
      } finally {
        await app.close();
      }
    });
  }

  for (const [name, data] of [
    ['Buffer', () => Buffer.from('payload')],
    ['stream', () => Readable.from(['payload'])],
  ] as const) {
    it(`sends a ${name} without JSON serialization`, async () => {
      const app = Fastify();
      const service = new FastifyTemplateService({}, config);
      app.get('/', async (request, reply) => {
        await service.apiHandler({ methodName: 'response', controller: new ResponseController(data()), request, reply, validatedArgs: [] });
        return reply;
      });
      try {
        const response = await app.inject('/');
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.equal('payload');
      } finally {
        await app.close();
      }
    });
  }

  it('keeps the first @Res response across two @Res calls and a returned value', async () => {
    const app = Fastify();
    const service = new FastifyTemplateService({}, config);
    app.get('/', async (request, reply) => {
      const validatedArgs = service.getValidatedArgs({ args: { res: { in: 'res', name: 'res' } }, request, reply });
      await service.apiHandler({ methodName: 'twice', controller: new ResponseController(undefined), request, reply, validatedArgs });
      return reply;
    });
    try {
      const response = await app.inject('/');
      expect(response.statusCode).to.equal(202);
      expect(response.body).to.equal('first');
    } finally {
      await app.close();
    }
  });

  it('reports a missing body prop through ValidationService', async () => {
    const app = Fastify();
    const service = new FastifyTemplateService({}, config);
    app.post('/', (request, reply) => {
      expect(() => service.getValidatedArgs({ args: { name: { in: 'body-prop', name: 'name', dataType: 'string', required: true } }, request, reply }))
        .to.throw(ValidateError)
        .with.property('fields')
        .that.deep.equals({ 'body.name': { message: "'name' is required" } });
      reply.send('validated');
    });
    try {
      expect((await app.inject({ method: 'POST', url: '/' })).body).to.equal('validated');
    } finally {
      await app.close();
    }
  });
});

describe('Fastify RegisterRoutes plugin', () => {
  it('rejects an enclosing multipart parser at startup', async () => {
    const app = Fastify();
    app.register(multipart);
    app.register(RegisterRoutes);
    try {
      await rejects(async () => app.ready(), {
        message:
          'tsoa RegisterRoutes registers @fastify/multipart itself. A multipart parser is already registered in an enclosing scope; register it in a sibling scope instead, and pass options through opts.multipart.',
      });
    } finally {
      await app.close();
    }
  });

  it('includes validation fields with the default error handler', async () => {
    const app = Fastify();
    app.register(RegisterRoutes);
    try {
      const response = await app.inject('/v1/GetTest/1/true/test?booleanParam=true&stringParam=test1234');
      expect(response.statusCode).to.equal(400);
      expect(JSON.parse(response.json().message).fields).to.deep.equal({ numberParam: { message: "'numberParam' is required" } });
    } finally {
      await app.close();
    }
  });

  it('supports prefixes and isolates binary parsers from JSON siblings', async () => {
    const app = Fastify();
    app.post('/sibling', request => request.body);
    app.register(RegisterRoutes, { prefix: '/prefix' });
    try {
      expect((await app.inject('/prefix/v1/GetTest')).statusCode).to.equal(200);
      expect((await app.inject('/v1/GetTest')).statusCode).to.equal(404);
      const binary = await app.inject({ method: 'POST', url: '/prefix/v1/MediaTypeTest/Binary', headers: { 'content-type': 'application/json' }, payload: '{"a":1}' });
      expect(binary.json()).to.deep.equal({ length: 7 });
      const json = await app.inject({ method: 'POST', url: '/sibling', payload: { a: 1 } });
      expect(json.json()).to.deep.equal({ a: 1 });
      const generatedJson = await app.inject({ method: 'POST', url: '/prefix/v1/MediaTypeTest/Custom', payload: { name: 'foo' } });
      expect(generatedJson.statusCode).to.equal(202);
      expect(generatedJson.json()).to.deep.equal({ id: 3, name: 'foo' });
    } finally {
      await app.close();
    }
  });

  it('applies multipart options only inside the registered plugin', async () => {
    const app = Fastify();
    app.post('/sibling', request => request.body);
    app.register(RegisterRoutes, { multipart: { limits: { fileSize: 2 } } });
    const payload = '--boundary\r\nContent-Disposition: form-data; name="someFile"; filename="a.txt"\r\nContent-Type: text/plain\r\n\r\nlarge\r\n--boundary--\r\n';
    try {
      const upload = await app.inject({ method: 'POST', url: '/v1/PostTest/File', headers: { 'content-type': 'multipart/form-data; boundary=boundary' }, payload });
      expect(upload.statusCode).to.equal(413);
      const sibling = await app.inject({ method: 'POST', url: '/sibling', headers: { 'content-type': 'multipart/form-data; boundary=boundary' }, payload });
      expect(sibling.statusCode).to.equal(415);
    } finally {
      await app.close();
    }
  });
});
