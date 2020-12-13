import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { server } from '../fixtures/koa-success-code/server';

describe('Koa Server with useSuccessResponseCode', () => {
  const basePath = '/v1';

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
  }

  function verifyRequest(verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: request.SuperTest<any>) => request.Test, expectedStatus = 200) {
    return new Promise<void>((resolve, reject) => {
      methodOperation(request(server))
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

  describe('NoExtends', () => {
    it('should ignore SuccessResponse code and use default code', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/customSuccessResponseCode`,
        (err, res) => {
          expect(res.status).to.equal(202);
        },
        202,
      );
    });

    it('should ignore SuccessResponse enum code and use default code', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/enumSuccessResponseCode`,
        (err, res) => {
          expect(res.status).to.equal(202);
        },
        202,
      );
    });

    it('should ignore SuccessResponse 2XX code and use default code', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/rangedSuccessResponse`,
        (err, res) => {
          expect(res.status).to.equal(204);
        },
        204,
      );
    });
  });

  it('shutdown server', () => server.close());
});
