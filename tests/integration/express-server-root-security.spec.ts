import { expect } from 'chai';
import 'mocha';
import { app } from '../fixtures/express-root-security/server';
import { TestModel, UserResponseModel } from '../fixtures/testModel';
import { verifyGetRequest } from './utils';

const basePath = '/v1';

describe('Express Server with api_key Root Security', () => {
  describe('Controller with undefined security', () => {
    const emptyHandler = (_err: unknown, _res: unknown) => {
      // This is an empty handler
    };

    it('returns a model if the correct API key is given', () => {
      return verifyGetRequest(app, basePath + '/Current?access_token=abc123456', (_err, res) => {
        const model = res.body as TestModel;
        expect(model.id).to.equal(1);
      });
    });

    it('returns 401 for an invalid key', () => {
      return verifyGetRequest(app, basePath + '/Current?access_token=invalid', emptyHandler, 401);
    });
  });

  describe('Controller with @NoSecurity', () => {
    const emptyHandler = (_err: unknown, _res: unknown) => {
      // This is an empty handler
    };

    it('returns a model without auth for a request with undefined method security', () => {
      return verifyGetRequest(app, basePath + '/NoSecurity/UndefinedSecurity', (_err, res) => {
        const model = res.body as UserResponseModel;
        expect(model.id).to.equal(1);
      });
    });

    describe('method with @Security(api_key)', () => {
      it('returns 401 for an invalid key', () => {
        return verifyGetRequest(app, basePath + '/NoSecurity?access_token=invalid', emptyHandler, 401);
      });

      it('returns a model with a valid key', () => {
        return verifyGetRequest(app, basePath + '/NoSecurity?access_token=abc123456', (_err, res) => {
          const model = res.body as UserResponseModel;
          expect(model.id).to.equal(1);
        });
      });
    });
  });
});
