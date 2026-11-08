import { Controller } from '@tsoa/runtime';
import { ExpressTemplateService } from '@tsoa/runtime/express';
import { expect } from 'chai';
import express from 'express';
import 'mocha';
import request from 'supertest';

describe('ExpressTemplateService response serialization', () => {
  const templateService = new ExpressTemplateService({}, { noImplicitAdditionalProperties: 'throw-on-extras', bodyCoercion: true });

  class ReturningController extends Controller {
    private readonly data: unknown;

    constructor(data: unknown, headers: Record<string, string>) {
      super();
      this.data = data;
      Object.entries(headers).forEach(([name, value]) => this.setHeader(name, value));
    }

    public async handle() {
      return this.data;
    }
  }

  function serve(data: unknown, headers: Record<string, string> = {}) {
    const app = express();
    app.get('/', (_req, res, next) => {
      void templateService.apiHandler({ methodName: 'handle', controller: new ReturningController(data, headers), response: res, next, validatedArgs: [] });
    });
    return request(app as Parameters<typeof request>[0])
      .get('/')
      .buffer(true);
  }

  it('should JSON-encode a string', async () => {
    const res = await serve('<b>hello</b>');

    expect(res.status).to.eq(200);
    expect(res.type).to.eq('application/json');
    expect(res.text).to.eq('"<b>hello</b>"');
  });

  it('should JSON-encode an empty string', async () => {
    const res = await serve('');

    expect(res.status).to.eq(200);
    expect(res.type).to.eq('application/json');
    expect(res.text).to.eq('""');
  });

  it('should JSON-encode an object', async () => {
    const res = await serve({ id: 1 });

    expect(res.type).to.eq('application/json');
    expect(res.body).to.deep.eq({ id: 1 });
  });

  it('should JSON-encode a number instead of using it as status code', async () => {
    const res = await serve(404);

    expect(res.status).to.eq(200);
    expect(res.type).to.eq('application/json');
    expect(res.text).to.eq('404');
  });

  it('should JSON-encode a boolean', async () => {
    const res = await serve(false);

    expect(res.status).to.eq(200);
    expect(res.type).to.eq('application/json');
    expect(res.text).to.eq('false');
  });

  it('should send a Buffer as binary octet-stream', async () => {
    const res = await serve(Buffer.from('bytes'));

    expect(res.type).to.eq('application/octet-stream');
    expect(Buffer.from(res.body).toString()).to.eq('bytes');
  });

  it('should send a Uint8Array view as binary octet-stream', async () => {
    const backing = new Uint8Array([0, 1, 2, 3, 4]);
    const res = await serve(new Uint8Array(backing.buffer, 1, 3));

    expect(res.type).to.eq('application/octet-stream');
    expect([...Buffer.from(res.body)]).to.deep.eq([1, 2, 3]);
  });

  it('should send a Buffer with the Content-Type set by the controller', async () => {
    const res = await serve(Buffer.from('png'), { 'Content-Type': 'image/png' });

    expect(res.type).to.eq('image/png');
    expect(Buffer.from(res.body).toString()).to.eq('png');
  });

  it('should send a string as-is when the controller set a non-JSON Content-Type', async () => {
    const res = await serve('plain text', { 'Content-Type': 'text/plain' });

    expect(res.type).to.eq('text/plain');
    expect(res.text).to.eq('plain text');
  });

  it('should JSON-encode a string when the controller set a JSON Content-Type', async () => {
    const res = await serve('text', { 'Content-Type': 'application/problem+json' });

    expect(res.type).to.eq('application/problem+json');
    expect(res.text).to.eq('"text"');
  });

  it('should JSON-encode null when the controller set a JSON Content-Type', async () => {
    const res = await serve(null, { 'Content-Type': 'application/json' });

    expect(res.status).to.eq(200);
    expect(res.text).to.eq('null');
  });

  it('should answer 204 for null', async () => {
    const res = await serve(null);

    expect(res.status).to.eq(204);
    expect(res.text).to.eq('');
  });

  it('should answer 204 for undefined', async () => {
    const res = await serve(undefined);

    expect(res.status).to.eq(204);
    expect(res.text).to.eq('');
  });
});
