import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { app } from '../fixtures/inversify-cpg/server';
import { TestModel } from '../fixtures/testModel';

const basePath = '/v1';

describe('Inversify Express Server with ControllerPathGlob', () => {
  it('can handle get request with no path argument', () => {
    return verifyGetRequest(basePath + '/ManagedTest?tsoa=abc123456', (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('handles request with managed controller using managed service', () => {
    return verifyGetRequest(basePath + '/ManagedTest?tsoa=abc123456', (_err, res) => {
      const model = res.body as TestModel;
      // expect controller to use the same service
      expect(model.id).to.equal(1);
    });
  });

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
  }

  function verifyRequest(verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: request.SuperTest<any>) => request.Test, expectedStatus = 200) {
    return new Promise((resolve, reject) => {
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
