import { expect } from 'chai';
import 'mocha';
import 'reflect-metadata';
import request from 'supertest';
import { app } from '../fixtures/inversify-async/server';
import { TestModel } from '../fixtures/testModel';

const basePath = '/v1';

describe('Inversify async IoC Express Server', () => {
  it('can handle get request with no path argument', () => {
    return verifyGetRequest(basePath + '/AsyncIocTest?tsoa=abc123456', (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle errors in DI', () => {
    return verifyGetRequest(
      basePath + '/AsyncIocErrorTest',
      err => {
        expect(err.text).to.equal('DI Error');
      },
      500,
    );
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
