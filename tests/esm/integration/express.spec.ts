import chai from 'chai';
const { expect } = chai;
import request from 'supertest';
import { it, describe } from 'mocha';
import { app } from '../fixtures/express/server.js';
import type { TestModel } from '../fixtures/testModel.js';

const basePath = '/v1';

describe('Express Server', () => {
  it('can handle get request to root controller`s path', () => {
    return verifyGetRequest(basePath + '/', (err, res) => {
      const model = res.body as TestModel;
      expect(model.str).to.equal('str');
    });
  });

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
  }

  function verifyRequest(verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: request.SuperTest<any>) => request.Test, expectedStatus = 200) {
    return new Promise<void>((resolve, reject) => {
      methodOperation(request(app))
        .expect(expectedStatus)
        .end((err: any, res: any) => {
          let parsedError: any;
          try {
            parsedError = JSON.parse(res.error);
          } catch (err) {
            parsedError = res.error;
          }

          if (err) {
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
