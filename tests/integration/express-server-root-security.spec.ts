import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { app } from '../fixtures/express-root-security/server';
import { TestModel, UserResponseModel } from '../fixtures/testModel';
import TestAgent = require('supertest/lib/agent');

const basePath = '/v1';

describe('Express Server with api_key Root Security', () => {
  describe('Controller with undefined security', () => {
    const emptyHandler = (_err: unknown, _res: unknown) => {
      // This is an empty handler
    };

    it('returns a model if the correct API key is given', () => {
      return verifyGetRequest(basePath + '/Current?access_token=abc123456', (_err, res) => {
        const model = res.body as TestModel;
        expect(model.id).to.equal(1);
      });
    });

    it('returns 401 for an invalid key', () => {
      return verifyGetRequest(basePath + '/Current?access_token=invalid', emptyHandler, 401);
    });
  });

  describe('Controller with @NoSecurity', () => {
    const emptyHandler = (_err: unknown, _res: unknown) => {
      // This is an empty handler
    };

    it('returns a model without auth for a request with undefined method security', () => {
      return verifyGetRequest(basePath + '/NoSecurity/UndefinedSecurity', (_err, res) => {
        const model = res.body as UserResponseModel;
        expect(model.id).to.equal(1);
      });
    });

    describe('method with @Security(api_key)', () => {
      it('returns 401 for an invalid key', () => {
        return verifyGetRequest(basePath + '/NoSecurity?access_token=invalid', emptyHandler, 401);
      });

      it('returns a model with a valid key', () => {
        return verifyGetRequest(basePath + '/NoSecurity?access_token=abc123456', (_err, res) => {
          const model = res.body as UserResponseModel;
          expect(model.id).to.equal(1);
        });
      });
    });
  });

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
  }

  function verifyRequest(verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: TestAgent<request.Test>) => request.Test, expectedStatus = 200) {
    return new Promise<void>((resolve, reject) => {
      methodOperation(request(app))
        .expect(expectedStatus)
        .end((err: any, res: any) => {
          let parsedError: any;
          try {
            parsedError = JSON.parse(res.error);
          } catch (err) {
            parsedError = res?.error;
          }

          if (err) {
            verifyResponse(err, res);
            reject({
              error: err,
              response: parsedError,
            });
            return;
          }

          verifyResponse(parsedError, res);
          resolve();
        });
    });
  }
});
