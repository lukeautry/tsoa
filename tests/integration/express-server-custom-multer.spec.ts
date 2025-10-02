import { File } from '@tsoa/runtime';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import 'mocha';
import { resolve } from 'path';
import { app } from '../fixtures/express/server';

import { verifyFileUploadRequest } from './utils';

const basePath = '/v1';

describe('Express Server With custom multer', () => {
  describe('file upload With custom multer instance', function () {
    this.timeout(15_000);

    it('can post a file', () => {
      const formData = { someFile: '@../package.json' };
      return verifyFileUploadRequest(app, basePath + '/PostTest/File', formData, (_err, res) => {
        const packageJsonBuffer = readFileSync(resolve(__dirname, '../package.json'));
        const returnedBuffer = Buffer.from(res.body.buffer);
        expect(res.body).to.not.be.undefined;
        expect(res.body.fieldname).to.equal('someFile');
        expect(res.body.originalname).to.equal('package.json');
        expect(res.body.encoding).to.be.not.undefined;
        expect(res.body.mimetype).to.equal('application/json');
        expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
      });
    });

    it('can post a file without name', () => {
      const formData = { aFile: '@../package.json' };
      return verifyFileUploadRequest(app, basePath + '/PostTest/FileWithoutName', formData, (_err, res) => {
        expect(res.body).to.not.be.undefined;
        expect(res.body.fieldname).to.equal('aFile');
      });
    });

    it('cannot post a file with wrong attribute name', async () => {
      const formData = { wrongAttributeName: '@../package.json' };
      verifyFileUploadRequest(app, basePath + '/PostTest/File', formData, (_err, res) => {
        expect(res.status).to.equal(500);
        expect(res.text).to.equal('{"message":"Unexpected field","name":"MulterError","status":500}');
      });
    });

    it('cannot post a file with no file', async () => {
      const formData = { notAFileAttribute: 'not a file' };
      verifyFileUploadRequest(app, basePath + '/PostTest/File', formData, (_err, res) => {
        expect(res.status).to.equal(400);
        expect(res.text).to.equal('{"fields":{"someFile":{"message":"\'someFile\' is required"}},"message":"An error occurred during the request.","name":"ValidateError","status":400}');
      });
    });

    it('can post a file with no file', async () => {
      const formData = { notAFileAttribute: 'not a file' };
      verifyFileUploadRequest(app, basePath + '/PostTest/FileOptional', formData, (_err, res) => {
        expect(res.status).to.equal(200);
        expect(res.text).to.equal('no file');
      });
    });

    it('can post multiple files with other form fields', () => {
      const formData = {
        a: 'b',
        c: 'd',
        someFiles: ['@../package.json', '@../tsconfig.json'],
      };

      return verifyFileUploadRequest(app, basePath + '/PostTest/ManyFilesAndFormFields', formData, (_err, res) => {
        for (const file of res.body as File[]) {
          const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
          const returnedBuffer = Buffer.from(file.buffer);
          expect(file).to.not.be.undefined;
          expect(file.fieldname).to.be.not.undefined;
          expect(file.originalname).to.be.not.undefined;
          expect(file.encoding).to.be.not.undefined;
          expect(file.mimetype).to.equal('application/json');
          expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
        }
      });
    });

    it('can post single file to multi file field', () => {
      const formData = {
        a: 'b',
        c: 'd',
        someFiles: ['@../package.json'],
      };

      return verifyFileUploadRequest(app, basePath + '/PostTest/ManyFilesAndFormFields', formData, (_err, res) => {
        expect(res.body).to.be.length(1);
      });
    });

    it('can post multiple files with different field', () => {
      const formData = {
        file_a: '@../package.json',
        file_b: '@../tsconfig.json',
      };
      return verifyFileUploadRequest(app, `${basePath}/PostTest/ManyFilesInDifferentFields`, formData, (_err, res) => {
        for (const file of res.body as File[]) {
          const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
          const returnedBuffer = Buffer.from(file.buffer);
          expect(file).to.not.be.undefined;
          expect(file.fieldname).to.be.not.undefined;
          expect(file.originalname).to.be.not.undefined;
          expect(file.encoding).to.be.not.undefined;
          expect(file.mimetype).to.equal('application/json');
          expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
        }
      });
    });

    it('can post multiple files with different array fields', () => {
      const formData = {
        files_a: ['@../package.json', '@../tsconfig.json'],
        file_b: '@../tsoa.json',
        files_c: ['@../tsconfig.json', '@../package.json'],
      };
      return verifyFileUploadRequest(app, `${basePath}/PostTest/ManyFilesInDifferentArrayFields`, formData, (_err, res) => {
        for (const fileList of res.body as File[][]) {
          for (const file of fileList) {
            const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
            const returnedBuffer = Buffer.from(file.buffer);
            expect(file).to.not.be.undefined;
            expect(file.fieldname).to.be.not.undefined;
            expect(file.originalname).to.be.not.undefined;
            expect(file.encoding).to.be.not.undefined;
            expect(file.mimetype).to.equal('application/json');
            expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
          }
        }
      });
    });

    it('can post mixed form data content with file and not providing optional file', () => {
      const formData = {
        username: 'test',
        avatar: '@../tsconfig.json',
      };
      return verifyFileUploadRequest(app, `${basePath}/PostTest/MixedFormDataWithFilesContainsOptionalFile`, formData, (_err, res) => {
        const file = res.body.avatar;
        const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
        const returnedBuffer = Buffer.from(file.buffer);
        expect(res.body.username).to.equal(formData.username);
        expect(res.body.optionalAvatar).to.undefined;
        expect(file).to.not.be.undefined;
        expect(file.fieldname).to.be.not.undefined;
        expect(file.originalname).to.be.not.undefined;
        expect(file.encoding).to.be.not.undefined;
        expect(file.mimetype).to.equal('application/json');
        expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
      });
    });

    it('can post mixed form data content with file and provides optional file', () => {
      const formData = {
        username: 'test',
        avatar: '@../tsconfig.json',
        optionalAvatar: '@../package.json',
      };
      return verifyFileUploadRequest(app, `${basePath}/PostTest/MixedFormDataWithFilesContainsOptionalFile`, formData, (_err, res) => {
        expect(res.body.username).to.equal(formData.username);
        for (const fieldName of ['avatar', 'optionalAvatar']) {
          const file = res.body[fieldName];
          const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
          const returnedBuffer = Buffer.from(file.buffer);
          expect(file).to.not.be.undefined;
          expect(file.fieldname).to.be.not.undefined;
          expect(file.originalname).to.be.not.undefined;
          expect(file.encoding).to.be.not.undefined;
          expect(file.mimetype).to.equal('application/json');
          expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
        }
      });
    });
  });
});
