import { File } from '@tsoa/runtime';
import { expect } from 'chai';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import 'mocha';
import { resolve } from 'path';
import { stateOf } from '../fixtures/controllers/middlewaresKoaController';
import { server } from '../fixtures/koa/server';
import { Gender, GenericModel, GenericRequest, Model, ParameterTestModel, TestClassModel, TestModel, ValidateMapStringToAny, ValidateMapStringToNumber, ValidateModel } from '../fixtures/testModel';
import { registerBasicRequestTests } from './common/basic-requests';
import { registerControllerTests, registerNoExtendsTests } from './common/controller-responses';
import { registerParameterDataTests, registerSubResourceTests } from './common/parameter-data';
import { registerRequestRejectionTests } from './common/request-rejections';
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
    const emptyHandler = (_err, _res) => {
      // This is an empty handler
    };

    it('can handle get request with access_token user id == 1', () => {
      return verifyGetRequest(app, basePath + '/SecurityTest/Koa?access_token=abc123456', (_err, res) => {
        const model = res.body as Model;
        expect(model.id).to.equal(1);
      });
    });

    it('can handle get request with access_token user id == 2', () => {
      return verifyGetRequest(app, basePath + '/SecurityTest/Koa?access_token=xyz123456', (_err, res) => {
        const model = res.body as Model;
        expect(model.id).to.equal(2);
      });
    });

    it('returns response with header set in authentication middleware', () => {
      return verifyGetRequest(app, basePath + '/SecurityTest/Koa?access_token=def123456', (_err, res) => {
        expect(res.headers['some-header']).to.equal('someValueFromAuthenticationMiddleware');
      });
    });

    it('returns custom response set in authentication middleware', () => {
      return verifyGetRequest(
        app,
        basePath + '/SecurityTest/Koa?access_token=ghi123456',
        (_err, res) => {
          expect(res.text).to.equal('some custom response');
        },
        401,
      );
    });

    it('resolves right away after first success', () => {
      const path = '/SecurityTest/ApiKeyOrTimesOut?access_token=abc123456';
      return verifyGetRequest(
        app,
        basePath + path,
        (_err, res) => {
          const model = res.body as Model;
          expect(model.id).to.equal(1);
        },
        200,
      );
    });

    describe('Optional security (empty entry)', () => {
      const anonymous = '/SecurityTest/ApiKeyOrAnonymous';

      it('passes the user when the API key is valid', () => {
        return verifyGetRequest(app, basePath + anonymous + '?access_token=abc123456', (_err, res) => {
          expect(res.body.id).to.equal(1);
        });
      });

      it('continues without a user when no credentials are sent', () => {
        return verifyGetRequest(
          app,
          basePath + anonymous,
          (_err, res) => {
            expect(res.body.name).to.equal('anonymous');
          },
          200,
        );
      });

      it('returns 401 when the API key is invalid', () => {
        return verifyGetRequest(app, basePath + anonymous + '?access_token=invalid', emptyHandler, 401);
      });

      it('returns 401 when one scheme has no credentials and another has invalid ones', () => {
        return verifyGetRequest(app, basePath + '/SecurityTest/ApiKeyOrOauthOrAnonymous?tsoa=invalid', emptyHandler, 401);
      });

      it('reports the invalid credential, not the scheme without credentials', () => {
        return verifyGetRequest(
          app,
          basePath + '/SecurityTest/ApiKeyOrOauthOrAnonymous?access_token=invalid',
          err => {
            expect(err.text).to.equal('api_key');
          },
          401,
        );
      });

      it('returns 401 when a scheme rejects with an unrelated error named MissingCredentialsError', () => {
        return verifyGetRequest(app, basePath + '/SecurityTest/ApiKeyOrOauthOrAnonymous?tsoa=named-error', emptyHandler, 401);
      });

      it('continues without a user when all schemes have no credentials', () => {
        return verifyGetRequest(
          app,
          basePath + '/SecurityTest/ApiKeyOrOauthOrAnonymous',
          (_err, res) => {
            expect(res.body.name).to.equal('anonymous');
          },
          200,
        );
      });

      it('returns 401 when an AND group has one missing and one invalid credential', () => {
        return verifyGetRequest(app, basePath + '/SecurityTest/ApiKeyAndOauthOrAnonymous?tsoa=invalid', emptyHandler, 401);
      });

      it('returns 401 when an AND group has a missing credential and a slower invalid one', () => {
        return verifyGetRequest(app, basePath + '/SecurityTest/ApiKeyAndOauthOrAnonymous?tsoa=slow-invalid', emptyHandler, 401);
      });

      it('keeps the response a slower AND group member sent before rejecting', () => {
        return verifyGetRequest(
          app,
          basePath + '/SecurityTest/ApiKeyAndOauthOrAnonymous?tsoa=slow-custom-response',
          (_err, res) => {
            expect(res.text).to.equal('some custom response');
          },
          403,
        );
      });

      it('passes the user of the second scheme when only its credentials are sent', () => {
        return verifyGetRequest(
          app,
          basePath + '/SecurityTest/ApiKeyOrOauthOrAnonymous?tsoa=abc123456',
          (_err, res) => {
            expect(res.body).to.deep.equal({});
          },
          200,
        );
      });

      it('continues without a user when an AND group has one valid and one missing credential', () => {
        return verifyGetRequest(
          app,
          basePath + '/SecurityTest/ApiKeyAndOauthOrAnonymous?tsoa=abc123456',
          (_err, res) => {
            expect(res.body.name).to.equal('anonymous');
          },
          200,
        );
      });

      it('passes the user when every member of an AND group is valid', () => {
        return verifyGetRequest(
          app,
          basePath + '/SecurityTest/ApiKeyAndOauthOrAnonymous?access_token=abc123456&tsoa=abc123456',
          (_err, res) => {
            expect(res.body.name).to.equal('Ironman');
          },
          200,
        );
      });

      it('continues without a user for controller-level optional security', () => {
        return verifyGetRequest(
          app,
          basePath + '/OptionalSecurityTest',
          (_err, res) => {
            expect(res.body.name).to.equal('anonymous');
          },
          200,
        );
      });

      it('passes the user for controller-level optional security', () => {
        return verifyGetRequest(
          app,
          basePath + '/OptionalSecurityTest?access_token=abc123456',
          (_err, res) => {
            expect(res.body.name).to.equal('Ironman');
          },
          200,
        );
      });

      it('returns 401 for controller-level security without credentials', () => {
        return verifyGetRequest(app, basePath + '/OverriddenSecurityTest', emptyHandler, 401);
      });

      it('continues without a user when a method-level empty entry overrides controller security', () => {
        return verifyGetRequest(
          app,
          basePath + '/OverriddenSecurityTest/Anonymous',
          (_err, res) => {
            expect(res.body.name).to.equal('anonymous');
          },
          200,
        );
      });

      it('keeps the response an authentication function sent before rejecting with missing credentials', () => {
        return verifyGetRequest(
          app,
          basePath + '/SecurityTest/ApiKeyAndOauthOrAnonymous?tsoa=slow-custom-response-missing',
          (_err, res) => {
            expect(res.text).to.equal('some custom response');
          },
          403,
        );
      });

      it('returns 200 for a route with only an empty security entry', () => {
        return verifyGetRequest(
          app,
          basePath + '/SecurityTest/AnonymousOnly',
          (_err, res) => {
            expect(res.body.name).to.equal('anonymous');
          },
          200,
        );
      });

      for (const kind of ['null', 'string']) {
        it(`returns 401 when a later AND group member rejects with a ${kind} value`, () => {
          return verifyGetRequest(app, basePath + `/SecurityTest/ApiKeyAndOauthOrAnonymous?tsoa=${kind}-rejection`, emptyHandler, 401);
        });
      }

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

      for (const earlierStatus of [200, 403]) {
        it(`continues without a user when an earlier middleware set the status ${earlierStatus}`, () => {
          return verifyGetRequest(
            app,
            basePath + `/SecurityTest/ApiKeyOrAnonymous?earlierStatus=${earlierStatus}`,
            (_err, res) => {
              expect(res.body.name).to.equal('anonymous');
            },
            200,
          );
        });
      }

      for (const [description, token, status] of [
        ['without a status', 'frozen', 401],
        ['with a status', 'frozen-status', 403],
      ] as const) {
        it(`answers a frozen error ${description}`, () => {
          return verifyGetRequest(
            app,
            basePath + `/SecurityTest/ApiKeyOrOauthOrAnonymous?access_token=${token}`,
            err => {
              expect(err.text).to.equal('api_key');
            },
            status,
          );
        });
      }

      it('keeps a response set before rejecting with missing credentials while another AND group member is pending', () => {
        return verifyGetRequest(
          app,
          basePath + '/SecurityTest/ApiKeyAndOauthOrAnonymous?access_token=never-settles&tsoa=slow-custom-response-missing',
          (_err, res) => {
            expect(res.text).to.equal('some custom response');
          },
          403,
        );
      });
    });

    describe('API key or tsoa auth', () => {
      it('returns 200 if the API key is correct', () => {
        const path = '/SecurityTest/OauthOrApiKey?access_token=abc123456&tsoa=invalid';
        return verifyGetRequest(
          app,
          basePath + path,
          (_err, res) => {
            const model = res.body as Model;
            expect(model.id).to.equal(1);
          },
          200,
        );
      });

      it('returns 200 if tsoa auth is correct', () => {
        const path = '/SecurityTest/OauthOrApiKey?access_token=invalid&tsoa=abc123456';
        return verifyGetRequest(app, basePath + path, emptyHandler, 200);
      });

      it('returns 200 if multiple auth handlers are correct', () => {
        const path = '/SecurityTest/OauthOrApiKey?access_token=abc123456&tsoa=abc123456';
        return verifyGetRequest(app, basePath + path, emptyHandler, 200);
      });

      it('returns 401 if neither API key nor tsoa auth are correct, last error to resolve is returned', () => {
        const path = '/SecurityTest/OauthOrApiKey?access_token=invalid&tsoa=invalid';
        return verifyGetRequest(
          app,
          basePath + path,
          err => {
            expect(err.text).to.equal('api_key');
          },
          401,
        );
      });

      it('should pass through error if controller method crashes', () => {
        return verifyGetRequest(
          app,
          basePath + `/SecurityTest/ServerErrorOauthOrApiKey?access_token=abc123456`,
          (_err, res) => {
            expect(res.status).to.equal(500);
          },
          500,
        );
      });
    });

    describe('API key and tsoa auth', () => {
      it('returns 200 if API and tsoa auth pass validation, resolved with user from first key in object', () => {
        const path = '/SecurityTest/OauthAndApiKey?access_token=abc123456&tsoa=abc123456';
        return verifyGetRequest(
          app,
          basePath + path,
          (_err, res) => {
            const model = res.body as Model;
            expect(model.id).to.equal(1);
          },
          200,
        );
      });

      it('returns 401 if API key is incorrect', () => {
        const path = '/SecurityTest/OauthAndApiKey?access_token=abc123456&tsoa=invalid';
        return verifyGetRequest(app, basePath + path, emptyHandler, 401);
      });

      it('returns 401 if tsoa auth is incorrect', () => {
        const path = '/SecurityTest/OauthAndApiKey?access_token=invalid&tsoa=abc123456';
        return verifyGetRequest(app, basePath + path, emptyHandler, 401);
      });

      it('should pass through error if controller method crashes', () => {
        return verifyGetRequest(
          app,
          basePath + `/SecurityTest/ServerErrorOauthAndApiKey?access_token=abc123456&tsoa=abc123456`,
          (_err, res) => {
            expect(res.status).to.equal(500);
          },
          500,
        );
      });
    });
  });

  registerParameterDataTests(app, basePath);

  registerSubResourceTests(app, basePath);

  describe('file upload', function () {
    this.timeout(20_000);

    it('can post a file', () => {
      const formData = { someFile: '@../package.json' };
      return verifyFileUploadRequest(app, basePath + '/PostTest/File', formData, (_err, res) => {
        const packageJsonBuffer = readFileSync(resolve(__dirname, '../package.json'));
        const returnedBuffer = Buffer.from(res.body.buffer);
        expect(res.body).to.not.be.undefined;
        expect(res.body.fieldname).to.equal('someFile');
        expect(res.body.originalname).to.equal('package.json');
        expect(res.body.encoding).to.be.not.undefined;
        expect(res.body.mimetype).to.equal('application/json');
        expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
      });
    });

    it('can post a file without name', () => {
      const formData = { aFile: '@../package.json' };
      return verifyFileUploadRequest(app, basePath + '/PostTest/FileWithoutName', formData, (_err, res) => {
        expect(res.body).to.not.be.undefined;
        expect(res.body.fieldname).to.equal('aFile');
      });
    });

    it('cannot post a file with wrong attribute name', () => {
      const formData = { wrongAttributeName: '@../package.json' };
      return verifyFileUploadRequest(
        app,
        basePath + '/PostTest/File',
        formData,
        (_err, res) => {
          expect(res.status).to.equal(500);
          expect(res.text).to.be.oneOf(['Unexpected field', 'Unexpected file field']);
        },
        500,
      );
    });

    it('cannot post a file with no file', () => {
      const formData = { notAFileAttribute: 'not a file' };
      return verifyFileUploadRequest(
        app,
        basePath + '/PostTest/File',
        formData,
        (_err, res) => {
          expect(res.status).to.equal(400);
          expect(res.text).to.equal('{"fields":{"someFile":{"message":"\'someFile\' is required"}}}');
        },
        400,
      );
    });

    it('can post a file with no file', () => {
      const formData = { notAFileAttribute: 'not a file' };
      return verifyFileUploadRequest(app, basePath + '/PostTest/FileOptional', formData, (_err, res) => {
        expect(res.status).to.equal(200);
        expect(res.text).to.equal('no file');
      });
    });

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

    it('can post multiple files with other form fields', () => {
      const formData = {
        a: 'b',
        c: 'd',
        someFiles: ['@../package.json', '@../tsconfig.json'],
      };

      return verifyFileUploadRequest(app, basePath + '/PostTest/ManyFilesAndFormFields', formData, (_err, res) => {
        for (const file of res.body as File[]) {
          const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
          const returnedBuffer = Buffer.from(file.buffer);
          expect(file).to.not.be.undefined;
          expect(file.fieldname).to.be.not.undefined;
          expect(file.originalname).to.be.not.undefined;
          expect(file.encoding).to.be.not.undefined;
          expect(file.mimetype).to.equal('application/json');
          expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
        }
      });
    });

    it('can post single file to multi file field', () => {
      const formData = {
        a: 'b',
        c: 'd',
        someFiles: ['@../package.json'],
      };

      return verifyFileUploadRequest(app, basePath + '/PostTest/ManyFilesAndFormFields', formData, (_err, res) => {
        expect(res.body).to.be.length(1);
      });
    });

    it('can post multiple files with different field', () => {
      const formData = {
        file_a: '@../package.json',
        file_b: '@../tsconfig.json',
      };
      return verifyFileUploadRequest(app, `${basePath}/PostTest/ManyFilesInDifferentFields`, formData, (_err, res) => {
        for (const file of res.body as File[]) {
          const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
          const returnedBuffer = Buffer.from(file.buffer);
          expect(file).to.not.be.undefined;
          expect(file.fieldname).to.be.not.undefined;
          expect(file.originalname).to.be.not.undefined;
          expect(file.encoding).to.be.not.undefined;
          expect(file.mimetype).to.equal('application/json');
          expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
        }
      });
    });

    it('can post multiple files with different array fields', () => {
      const formData = {
        files_a: ['@../package.json', '@../tsconfig.json'],
        file_b: '@../tsoa.json',
        files_c: ['@../tsconfig.json', '@../package.json'],
      };
      return verifyFileUploadRequest(app, `${basePath}/PostTest/ManyFilesInDifferentArrayFields`, formData, (_err, res) => {
        for (const fileList of res.body as File[][]) {
          for (const file of fileList) {
            const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
            const returnedBuffer = Buffer.from(file.buffer);
            expect(file).to.not.be.undefined;
            expect(file.fieldname).to.be.not.undefined;
            expect(file.originalname).to.be.not.undefined;
            expect(file.encoding).to.be.not.undefined;
            expect(file.mimetype).to.equal('application/json');
            expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
          }
        }
      });
    });

    it('can post mixed form data content with file and not providing optional file', () => {
      const formData = {
        username: 'test',
        avatar: '@../tsconfig.json',
      };
      return verifyFileUploadRequest(app, `${basePath}/PostTest/MixedFormDataWithFilesContainsOptionalFile`, formData, (_err, res) => {
        const file = res.body.avatar;
        const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
        const returnedBuffer = Buffer.from(file.buffer);
        expect(res.body.username).to.equal(formData.username);
        expect(res.body.optionalAvatar).to.undefined;
        expect(file).to.not.be.undefined;
        expect(file.fieldname).to.be.not.undefined;
        expect(file.originalname).to.be.not.undefined;
        expect(file.encoding).to.be.not.undefined;
        expect(file.mimetype).to.equal('application/json');
        expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
      });
    });

    it('can post mixed form data content with file and provides optional file', () => {
      const formData = {
        username: 'test',
        avatar: '@../tsconfig.json',
        optionalAvatar: '@../package.json',
      };
      return verifyFileUploadRequest(app, `${basePath}/PostTest/MixedFormDataWithFilesContainsOptionalFile`, formData, (_err, res) => {
        expect(res.body.username).to.equal(formData.username);
        for (const fieldName of ['avatar', 'optionalAvatar']) {
          const file = res.body[fieldName];
          const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
          const returnedBuffer = Buffer.from(file.buffer);
          expect(file).to.not.be.undefined;
          expect(file.fieldname).to.be.not.undefined;
          expect(file.originalname).to.be.not.undefined;
          expect(file.encoding).to.be.not.undefined;
          expect(file.mimetype).to.equal('application/json');
          expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
        }
      });
    });
  });

  it('shutdown server', () => server.close());
});
