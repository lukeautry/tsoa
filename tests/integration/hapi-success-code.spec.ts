import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { server } from '../fixtures/hapi-success-code/server';

describe('Hapi Server with useSuccessResponseCode', () => {
  const basePath = '/v1';

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
  }

  function verifyRequest(verifyResponse: (err: any, res: any) => any, methodOperation: (request: request.SuperTest<any>) => request.Test, expectedStatus = 200) {
    return new Promise<void>((resolve, reject) => {
      methodOperation(request(server.listener))
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
    it('should apply custom code from success response', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/customSuccessResponseCode`,
        (err, res) => {
          expect(res.status).to.equal(202);
        },
        202,
      );
    });

    it('should apply enum code from success response', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/enumSuccessResponseCode`,
        (err, res) => {
          expect(res.status).to.equal(202);
        },
        202,
      );
    });

    it('should ignore named success response', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/rangedSuccessResponse`,
        (err, res) => {
          expect(res.status).to.equal(204);
        },
        204,
      );
    });
  });

  describe('Controller', () => {
    it('should normal status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/normalStatusCode`,
        (err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should normal status code with false boolean result', () => {
      return verifyGetRequest(
        basePath + `/Controller/falseStatusCode`,
        (err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should normal status code with 0 result', () => {
      return verifyGetRequest(
        basePath + `/Controller/zeroStatusCode`,
        (err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should no content status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/noContentStatusCode`,
        (err, res) => {
          expect(res.status).to.equal(204);
        },
        204,
      );
    });

    it('should custom status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/customStatusCode`,
        (err, res) => {
          expect(res.status).to.equal(205);
        },
        205,
      );
    });

    it('should use success response status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/successResponse`,
        (_err, res) => {
          expect(res.status).to.equal(418);
        },
        418,
      );
    });
  });
});
