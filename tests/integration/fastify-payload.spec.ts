import { expect } from 'chai';
import Fastify, { FastifyInstance } from 'fastify';
import 'mocha';
import { Readable, Transform } from 'stream';
import { RegisterRoutes } from '../fixtures/fastify/routes';

const multipartFile = '--boundary\r\nContent-Disposition: form-data; name="someFile"; filename="a.txt"\r\nContent-Type: text/plain\r\n\r\nlarge\r\n--boundary--\r\n';

describe('Fastify payload handling', () => {
  let app: FastifyInstance;
  afterEach(() => app.close());

  describe('binary body', () => {
    it('hands a payload replaced in preParsing to the controller', async () => {
      app = Fastify();
      app.addHook('preParsing', async () => Readable.from([Buffer.from('replaced')]));
      app.register(RegisterRoutes);
      const response = await app.inject({ method: 'POST', url: '/v1/MediaTypeTest/Binary', headers: { 'content-type': 'application/octet-stream' }, payload: 'original payload' });
      expect(response.statusCode).to.equal(200);
      expect(response.json()).to.deep.equal({ length: 'replaced'.length });
    });

    it('hands a payload transformed in preParsing to the controller', async () => {
      app = Fastify();
      app.addHook('preParsing', async (_request, _reply, payload) =>
        payload.pipe(
          new Transform({
            transform(chunk: Buffer, _encoding, done) {
              done(null, Buffer.concat([chunk, chunk]));
            },
          }),
        ),
      );
      app.register(RegisterRoutes);
      const response = await app.inject({ method: 'POST', url: '/v1/MediaTypeTest/Binary', headers: { 'content-type': 'application/octet-stream' }, payload: 'abcd' });
      expect(response.statusCode).to.equal(200);
      expect(response.json()).to.deep.equal({ length: 8 });
    });

    it('hands an empty stream to the controller for a POST without a body or content type', async () => {
      app = Fastify();
      app.register(RegisterRoutes);
      const response = await app.inject({ method: 'POST', url: '/v1/MediaTypeTest/Binary' });
      expect(response.statusCode).to.equal(200);
      expect(response.json()).to.deep.equal({ length: 0 });
    });

    it('hands an empty stream to the controller for a POST with a content type and no body', async () => {
      app = Fastify();
      app.register(RegisterRoutes);
      const response = await app.inject({ method: 'POST', url: '/v1/MediaTypeTest/Binary', headers: { 'content-type': 'application/octet-stream' } });
      expect(response.statusCode).to.equal(200);
      expect(response.json()).to.deep.equal({ length: 0 });
    });
  });

  describe('multipart file size limit', () => {
    it('rejects a truncated file with 413 when throwFileSizeLimit is false', async () => {
      app = Fastify();
      app.register(RegisterRoutes, { multipart: { throwFileSizeLimit: false, limits: { fileSize: 2 } } });
      const response = await app.inject({ method: 'POST', url: '/v1/PostTest/File', headers: { 'content-type': 'multipart/form-data; boundary=boundary' }, payload: multipartFile });
      expect(response.statusCode).to.equal(413);
    });

    it('rejects an oversized file with 413 by default', async () => {
      app = Fastify();
      app.register(RegisterRoutes, { multipart: { limits: { fileSize: 2 } } });
      const response = await app.inject({ method: 'POST', url: '/v1/PostTest/File', headers: { 'content-type': 'multipart/form-data; boundary=boundary' }, payload: multipartFile });
      expect(response.statusCode).to.equal(413);
    });

    it('accepts a file within the limit when throwFileSizeLimit is false', async () => {
      app = Fastify();
      app.register(RegisterRoutes, { multipart: { throwFileSizeLimit: false, limits: { fileSize: 5 } } });
      const response = await app.inject({ method: 'POST', url: '/v1/PostTest/File', headers: { 'content-type': 'multipart/form-data; boundary=boundary' }, payload: multipartFile });
      expect(response.statusCode).to.equal(200);
      expect(response.json()).to.include({ fieldname: 'someFile', originalname: 'a.txt', mimetype: 'text/plain', size: 5 });
    });
  });
});
