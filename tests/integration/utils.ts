import { expect } from 'chai';
import request from 'supertest';
import TestAgent = require('supertest/lib/agent');
import { Agent } from 'http';
import { resolve } from 'path';
import { App } from 'supertest/types';

export function verifyRequest(app: App, verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: TestAgent<request.Test>) => request.Test, expectedStatus = 200) {
  return new Promise<void>((resolve, reject) => {
    methodOperation(request(app))
      .expect(expectedStatus)
      .end((err: any, res: any) => {
        try {
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
        } catch (error) {
          reject(error);
        }
      });
  });
}

export function verifyGetRequest(app: App, path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
  return verifyRequest(app, verifyResponse, request => request.get(path), expectedStatus);
}

export function verifyPostRequest(app: App, path: string, data: any, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
  return verifyRequest(app, verifyResponse, request => request.post(path).send(data), expectedStatus);
}

export function verifyFileUploadRequest(
  app: App,
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

export function describeQueryMethod(app: App, basePath: string) {
  // supertest sends QUERY at runtime, but its types still describe agent.query as the query-string helper.
  const query = (path: string, body: object) => (agent: TestAgent<request.Test>) => (agent as unknown as { query(url: string): request.Test }).query(path).send(body);

  describe('QUERY method', () => {
    it('passes the request body and query string to the controller', () =>
      verifyRequest(app, (_err, res) => expect(res.body).to.deep.equal({ surname: 'Smith', limit: 5, page: 2 }), query(`${basePath}/QueryMethodTest?page=2`, { surname: 'Smith', limit: 5 })));

    it('passes a path parameter to the controller', () =>
      verifyRequest(app, (_err, res) => expect(res.body).to.deep.equal({ surname: 'Jones', limit: 10, tenant: 'acme' }), query(`${basePath}/QueryMethodTest/acme`, { surname: 'Jones' })));

    it('validates the request body', () =>
      verifyRequest(app, (err, _res) => expect(JSON.parse(err.text).fields['filter.surname'].message).to.equal("'surname' is required"), query(`${basePath}/QueryMethodTest`, { limit: 5 }), 400));
  });
}
