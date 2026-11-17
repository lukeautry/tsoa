import { expect } from 'chai';
import Fastify from 'fastify';
import { RegisterRoutes as RegisterFieldRoutes } from '../fixtures/fastify-fields/routes';
import { RegisterRoutes as RegisterHeadRoutes } from '../fixtures/fastify-head/routes';
import { RegisterRoutes } from '../fixtures/fastify/routes';

const multipartFields = '--boundary\r\nContent-Disposition: form-data; name="a"\r\n\r\nhello\r\n--boundary--\r\n';

describe('Fastify generated route combinations', () => {
  for (const exposeHeadRoutes of [true, false]) {
    it(`registers explicit HEAD routes while exposeHeadRoutes is ${exposeHeadRoutes}`, async () => {
      const app = Fastify({ exposeHeadRoutes });
      app.register(RegisterHeadRoutes);
      try {
        await app.ready();
        expect((await app.inject('/head-pair')).body).to.equal('get');
        expect((await app.inject({ method: 'HEAD', url: '/head-pair' })).statusCode).to.equal(202);
        expect((await app.inject('/parameter-head-pair/1')).body).to.equal('parameter');
        expect((await app.inject({ method: 'HEAD', url: '/parameter-head-pair/1' })).statusCode).to.equal(202);
        expect((await app.inject({ method: 'HEAD', url: '/head-pair/implicit' })).statusCode).to.equal(exposeHeadRoutes ? 200 : 404);
      } finally {
        await app.close();
      }
    });
  }

  it('collects multipart fields in an application without uploaded-file parameters', async () => {
    const app = Fastify();
    app.register(RegisterFieldRoutes);
    try {
      const response = await app.inject({ method: 'POST', url: '/fields', headers: { 'content-type': 'multipart/form-data; boundary=boundary' }, payload: multipartFields });
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.equal('hello');
    } finally {
      await app.close();
    }
  });

  it('collects multipart fields on a field-only route next to upload routes', async () => {
    const app = Fastify();
    app.register(RegisterRoutes);
    try {
      const response = await app.inject({ method: 'POST', url: '/v1/PostTest/DeprecatedFormField', headers: { 'content-type': 'multipart/form-data; boundary=boundary' }, payload: multipartFields });
      expect(response.statusCode).to.equal(200);
    } finally {
      await app.close();
    }
  });
});
