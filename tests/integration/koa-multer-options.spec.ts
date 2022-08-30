import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { server } from '../fixtures/koa-multer-options/server';
import { resolve } from 'path';
import * as os from 'os';

const basePath = '/v1';

describe('Koa Server (with multerOpts)', () => {
  describe('file upload', () => {
    it('can post a file', () => {
      const formData = { someFile: '@../package.json' };
      return verifyFileUploadRequest(basePath + '/PostTest/File', formData, (err, res) => {
        expect(res.body).to.not.be.undefined;
        expect(res.body.fieldname).to.equal('someFile');
        expect(res.body.originalname).to.equal('package.json');
        expect(res.body.encoding).to.be.not.undefined;
        expect(res.body.mimetype).to.equal('application/json');
        expect(res.body.path).to.satisfy(value => value.startsWith(os.tmpdir()));
      });
    });

    function verifyFileUploadRequest(
      path: string,
      formData: any,
      verifyResponse: (err: any, res: request.Response) => any = () => {
        /**/
      },
      expectedStatus?: number,
    ) {
      return verifyRequest(
        verifyResponse,
        request =>
          Object.keys(formData).reduce((req, key) => {
            const values = [].concat(formData[key]);
            values.forEach((v: any) => (v.startsWith('@') ? req.attach(key, resolve(__dirname, v.slice(1))) : req.field(key, v)));
            return req;
          }, request.post(path)),
        expectedStatus,
      );
    }
  });

  it('shutdown server', () => server.close());

  function verifyRequest(verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: request.SuperTest<any>) => request.Test, expectedStatus = 200) {
    return new Promise<void>((resolve, reject) => {
      methodOperation(request(server))
        .expect(expectedStatus)
        .end((err: any, res: any) => {
          let parsedError: any;

          try {
            parsedError = JSON.parse(res.error);
          } catch (err) {
            parsedError = res?.error;
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
