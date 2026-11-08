import { expect } from 'chai';
import { unlinkSync, writeFileSync } from 'fs';
import 'mocha';
import { stateOf } from '../fixtures/controllers/middlewaresKoaController';
import { server } from '../fixtures/koa/server';
import { registerBasicRequestTests } from './common/basic-requests';
import { registerControllerTests, registerNoExtendsTests } from './common/controller-responses';
import { registerParameterDataTests, registerSubResourceTests } from './common/parameter-data';
import { registerFileUploadTests } from './common/file-upload';
import { registerRequestRejectionTests } from './common/request-rejections';
import { registerSecurityTests } from './common/security';
import { registerValidateTests } from './common/validate';
import { verifyRequest, verifyGetRequest, verifyPostRequest, verifyFileUploadRequest } from './utils';

const app = server;
const basePath = '/v1';

describe('Koa Server', () => {
  registerBasicRequestTests(app, basePath);

  registerRequestRejectionTests(app, basePath);

  it('can invoke middlewares installed in routes and paths', () => {
    expect(stateOf('route')).to.be.undefined;
    return verifyGetRequest(
      app,
      basePath + '/MiddlewareTestKoa/test1',
      (_err, _res) => {
        expect(stateOf('route')).to.be.true;
        expect(stateOf('test1')).to.be.true;
        expect(stateOf('test2')).to.be.true;
      },
      204,
    );
  });

  registerControllerTests(app, basePath);

  describe('Custom Content-Type', () => {
    it('should return custom content-type if given', () => {
      return verifyPostRequest(
        app,
        basePath + '/MediaTypeTest/Custom',
        { name: 'foo' },
        (_err, res) => {
          expect(res.type).to.eq('application/vnd.mycompany.myapp.v2+json');
        },
        202,
      );
    });

    it('should hand a raw octet-stream request body to the controller as a stream', () => {
      const payload = Buffer.alloc(64 * 1024, 'a');
      return verifyRequest(
        app,
        (_err, res) => {
          expect(res.body).to.deep.eq({ length: payload.length });
        },
        request =>
          request
            .post(basePath + '/MediaTypeTest/Binary')
            .set('Content-Type', 'application/octet-stream')
            .send(payload),
        200,
      );
    });

    it('should hand a raw request body with a custom media type to the controller as a stream', () => {
      const payload = Buffer.alloc(64 * 1024, 'a');
      return verifyRequest(
        app,
        (_err, res) => {
          expect(res.body).to.deep.eq({ length: payload.length });
        },
        request =>
          request
            .post(basePath + '/MediaTypeTest/Binary/Custom')
            .set('Content-Type', 'image/png')
            .send(payload),
        200,
      );
    });

    it('should reject a JSON body that a body parser consumed instead of passing the ended stream', () => {
      return verifyRequest(
        app,
        (_err, res) => {
          expect(res.status).to.eq(400);
        },
        request => request.post(basePath + '/MediaTypeTest/Binary').send({ name: 'foo' }),
        400,
      );
    });

    it('should report a consumed body and an invalid query parameter together', () => {
      return verifyRequest(
        app,
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(Object.keys(body.fields)).to.have.members(['body', 'tag']);
        },
        request => request.post(basePath + '/MediaTypeTest/Binary/Query?tag=abc').send({ name: 'foo' }),
        400,
      );
    });

    it('should hand an empty request body to the controller as an empty stream', () => {
      return verifyRequest(
        app,
        (_err, res) => {
          expect(res.body).to.deep.eq({ length: 0 });
        },
        request => request.post(basePath + '/MediaTypeTest/Binary').set('Content-Type', 'application/octet-stream'),
        200,
      );
    });
  });

  registerNoExtendsTests(app, basePath);

  registerValidateTests(app, basePath);

  describe('Security', () => {
    registerSecurityTests(app, basePath);

    describe('Optional security (empty entry)', () => {
      const emptyHandler = () => {};

      for (const [description, kind] of [
        ['no body', 'status-only'],
        ['an empty body', 'empty-body'],
        ['the body false', 'false-body'],
        ['the body 0', 'zero-body'],
      ]) {
        it(`keeps the 403 an authentication function set with ${description} before rejecting with missing credentials`, () => {
          return verifyGetRequest(app, basePath + `/SecurityTest/ApiKeyOrOauthOrAnonymous?tsoa=${kind}-missing`, emptyHandler, 403);
        });
      }

      for (const [description, kind] of [
        ['no body', 'status-only'],
        ['an empty body', 'empty-body'],
      ]) {
        it(`answers 401 on a route without an empty entry when an authentication function set a status with ${description}`, () => {
          return verifyGetRequest(app, basePath + `/SecurityTest/OauthOrApiKey?tsoa=${kind}-missing`, emptyHandler, 401);
        });
      }

      it('keeps the status a slower AND group member set before rejecting with missing credentials', () => {
        return verifyGetRequest(app, basePath + '/SecurityTest/ApiKeyAndOauthOrAnonymous?tsoa=slow-status-missing', emptyHandler, 403);
      });
    });
  });

  registerParameterDataTests(app, basePath);

  registerSubResourceTests(app, basePath);

  describe('file upload', function () {
    this.timeout(20_000);

    registerFileUploadTests(app, basePath);

    it('cannot post a file more than the default 8mb limit', async () => {
      writeFileSync('./moreThanDefault8mb', Buffer.alloc(8 * 1024 * 1024 + 1));
      try {
        await verifyFileUploadRequest(
          app,
          basePath + '/PostTest/File',
          { someFile: '@../moreThanDefault8mb' },
          (_err, res) => {
            expect(res.status).to.equal(500);
            expect(res.text).to.equal('File too large');
          },
          500,
        );
      } finally {
        unlinkSync('./moreThanDefault8mb');
      }
    });
  });

  it('shutdown server', () => server.close());
});
