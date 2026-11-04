import { Controller } from '@tsoa/runtime';
import { ExpressTemplateService } from '@tsoa/runtime/express';
import { expect } from 'chai';
import express from 'express';
import 'mocha';
import { Readable } from 'node:stream';
import request from 'supertest';

describe('ExpressTemplateService stream errors before any data', () => {
  const templateService = new ExpressTemplateService({}, { noImplicitAdditionalProperties: 'throw-on-extras', bodyCoercion: true });

  class FailingDownloadController extends Controller {
    constructor(status?: number) {
      super();
      this.setHeader('Content-Type', 'application/pdf');
      this.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
      if (status !== undefined) {
        this.setStatus(status);
      }
    }

    public async download() {
      return new Readable({
        read() {
          this.destroy(new Error('stream_test_error'));
        },
      });
    }
  }

  function serve(controller: Controller, errorHandler: express.ErrorRequestHandler, earlierMiddleware: express.RequestHandler = (_req, _res, next) => next()) {
    const app = express();
    app.get('/', earlierMiddleware, (_req, res, next) => {
      void templateService.apiHandler({ methodName: 'download', controller, response: res, next, validatedArgs: [] });
    });
    app.use(errorHandler);
    return request(app as Parameters<typeof request>[0]).get('/');
  }

  const answerWith500: express.ErrorRequestHandler = (error: Error, _req, res, _next) => {
    res.status(500).json({ message: error.message });
  };

  it('should not hand the controller headers to the error handler', async () => {
    const res = await serve(new FailingDownloadController(), answerWith500);

    expect(res.status).to.eq(500);
    expect(res.type).to.eq('application/json');
    expect(res.headers).to.not.have.property('content-disposition');
    expect(res.body).to.deep.equal({ message: 'stream_test_error' });
  });

  it('should not hand the controller status to an error handler that sets none', async () => {
    const res = await serve(new FailingDownloadController(206), (error: Error, _req, res, _next) => {
      res.json({ message: error.message });
    });

    expect(res.status).to.eq(200);
    expect(res.headers).to.not.have.property('content-disposition');
  });

  it('should keep headers set by earlier middleware', async () => {
    const res = await serve(new FailingDownloadController(), answerWith500, (_req, res, next) => {
      res.setHeader('X-Request-Id', 'abc');
      res.setHeader('Content-Disposition', 'inline');
      next();
    });

    expect(res.status).to.eq(500);
    expect(res.headers['x-request-id']).to.eq('abc');
    expect(res.headers['content-disposition']).to.eq('inline');
  });
});
