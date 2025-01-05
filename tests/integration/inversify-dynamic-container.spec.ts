import { expect } from 'chai';
import 'mocha';
import 'reflect-metadata';
import * as request from 'supertest';
import { app } from '../fixtures/inversify-dynamic-container/server';
import TestAgent = require('supertest/lib/agent');

const basePath = '/v1';

describe('Inversify Express Server Dynamic Container', () => {
  it('can handle get request with no path argument', () => {
    return verifyGetRequest(basePath + '/ManagedTest?tsoa=abc123456', (err, res) => {
      const model = res.text;
      expect(model).to.equal(basePath + '/ManagedTest');
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
