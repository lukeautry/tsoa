import { expect } from 'chai';
import 'mocha';
import { App } from 'supertest/types';
import { Model } from '../../fixtures/testModel';
import { verifyGetRequest } from '../utils';

export function registerSecurityTests(app: App, basePath: string) {
  const emptyHandler = () => {};

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
}
