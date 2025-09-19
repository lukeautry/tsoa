import * as request from 'supertest';
import TestAgent = require('supertest/lib/agent');
import { Agent } from 'http';
import { resolve } from 'path';

export function verifyRequest(app: any, verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: TestAgent<request.Test>) => request.Test, expectedStatus = 200) {
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

export function verifyGetRequest(app: any, path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
  return verifyRequest(app, verifyResponse, request => request.get(path), expectedStatus);
}

export function verifyPostRequest(app: any, path: string, data: any, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
  return verifyRequest(app, verifyResponse, request => request.post(path).send(data), expectedStatus);
}

export function verifyFileUploadRequest(
  app: any,
  path: string,
  formData: any,
  verifyResponse: (err: any, res: request.Response) => any = () => {
    /**/
  },
  expectedStatus?: number,
) {
  const agent = new Agent({
    keepAlive: true,
    maxSockets: Infinity,
    timeout: 15000,
  });
  return verifyRequest(
    app,
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
        req.agent(agent);
        return req;
      }, request.post(path)),
    expectedStatus,
  );
}
