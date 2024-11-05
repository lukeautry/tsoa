import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { server } from '../fixtures/koa-multer-options/server';
import { resolve } from 'path';
import * as os from 'os';
import { unlinkSync, writeFileSync } from 'fs';
import TestAgent = require('supertest/lib/agent');

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
        expect(res.body.path).to.satisfy((value: string) => value.startsWith(os.tmpdir()));
      });
    });

    it('can post file less than default 8mb', () => {
      writeFileSync('./lessThan8mb', new Buffer(8 * 1024 * 1024 - 1));
      const formData = { someFile: '@../lessThan8mb' };
      return verifyFileUploadRequest(basePath + '/PostTest/File', formData, (req, res) => {
        expect(res.body).to.not.be.undefined;
        expect(res.body.fieldname).to.equal('someFile');
        expect(res.body.originalname).to.equal('lessThan8mb');
        expect(res.body.encoding).to.be.not.undefined;
        expect(res.body.path).to.satisfy((value: string) => value.startsWith(os.tmpdir()));
        unlinkSync('./lessThan8mb');
      });
    });

    it('cannot post file more than default 8mb', async () => {
      writeFileSync('./moreThan8mb', new Buffer(8 * 1024 * 1024));
      const formData = { someFile: '@../moreThan8mb' };
      let hasError = false;
      try {
        await verifyFileUploadRequest(basePath + '/PostTest/File', formData);
      } catch (err: any) {
        expect(err.response.status).to.be.eq(500);
        expect(err.response.text).to.be.eq('File too large');
        hasError = true;
      } finally {
        unlinkSync('./moreThan8mb');
      }
      if (!hasError) {
        throw new Error('Should raise error about file too large and status 500.');
      }
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
            values.forEach((v: string) => {
              if (v.startsWith('@')) {
                req.attach(key, resolve(__dirname, v.slice(1)));
              } else {
                req.field(key, v);
              }
            });
            return req;
          }, request.post(path)),
        expectedStatus,
      );
    }
  });

  it('shutdown server', () => server.close());

  function verifyRequest(verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: TestAgent<request.Test>) => request.Test, expectedStatus = 200) {
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
