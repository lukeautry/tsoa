import { expect } from 'chai';
import 'mocha';
import { stateOf } from '../fixtures/controllers/middlewaresFastifyController';
import { server, app as fastify } from '../fixtures/fastify/server';
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

describe('Fastify Server', () => {
  before(() => fastify.listen({ port: 0 }));
  after(() => fastify.close());
  registerBasicRequestTests(app, basePath);

  registerRequestRejectionTests(app, basePath);

  it('can invoke middlewares installed in routes and paths', () => {
    expect(stateOf('route')).to.be.undefined;
    return verifyGetRequest(
      app,
      basePath + '/MiddlewareTestFastify/test1',
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
      const emptyHandler = (_err, _res) => {
        // This is an empty handler
      };

      for (const [description, kind] of [
        ['no body', 'status-only'],
        ['an empty body', 'empty-body'],
        ['the body false', 'false-body'],
        ['the body 0', 'zero-body'],
      ]) {
        it(`keeps the 403 an authentication function set with ${description} before rejecting with missing credentials`, () => {
          return verifyGetRequest(
            app,
            basePath + `/SecurityTest/ApiKeyOrOauthOrAnonymous?tsoa=${kind}-missing`,
            (_err, res) => {
              if (kind === 'status-only') expect(res.text).to.equal('Forbidden');
            },
            403,
          );
        });
      }

      it('answers 401 on a route without an empty entry when an authentication function set a status with no body', () => {
        return verifyGetRequest(app, basePath + '/SecurityTest/OauthOrApiKey?tsoa=status-only-missing', emptyHandler, 401);
      });

      // Fastify sends an empty body immediately, so authentication cannot replace its 403 afterward.
      it.skip('answers 401 on a route without an empty entry when an authentication function set a status with an empty body', () => {
        return verifyGetRequest(app, basePath + '/SecurityTest/OauthOrApiKey?tsoa=empty-body-missing', emptyHandler, 401);
      });

      it('keeps the status a slower AND group member set before rejecting with missing credentials', () => {
        return verifyGetRequest(
          app,
          basePath + '/SecurityTest/ApiKeyAndOauthOrAnonymous?tsoa=slow-status-missing',
          (_err, res) => {
            expect(res.text).to.equal('Forbidden');
          },
          403,
        );
      });
    });
  });

  registerParameterDataTests(app, basePath);

  registerSubResourceTests(app, basePath);

  describe('file upload', function () {
    this.timeout(20_000);

    registerFileUploadTests(app, basePath);

    it('validates repeated multipart text fields as an array in encounter order', () => {
      return verifyFileUploadRequest(
        app,
        `${basePath}/PostTest/MixedFormDataWithFilesContainsOptionalFile`,
        { username: ['first', 'last'], avatar: '@../tsconfig.json' },
        (_err, res) => {
          expect(JSON.parse(res.text).fields.username).to.deep.equal({ message: 'invalid string value', value: ['first', 'last'] });
        },
        400,
      );
    });

    it('rejects truncated multipart text fields', () => {
      return verifyFileUploadRequest(
        app,
        `${basePath}/PostTest/MixedFormDataWithFilesContainsOptionalFile`,
        { username: 'x'.repeat(1048577), avatar: '@../tsconfig.json' },
        (_err, res) => {
          expect(res.text).to.equal('Field value too long');
        },
        500,
      );
    });
  });
});
