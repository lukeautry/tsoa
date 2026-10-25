import { MissingCredentialsError } from '@tsoa/runtime';
import * as express from 'express';

export function expressAuthentication(req: express.Request, name: string, scopes: string[] | undefined, response: express.Response): Promise<any> {
  if (name === 'api_key') {
    let token;
    if (req.query && req.query.access_token) {
      token = req.query.access_token;
    } else {
      return Promise.reject(new MissingCredentialsError('api_key'));
    }

    if (token === 'abc123456') {
      return Promise.resolve({
        id: 1,
        name: 'Ironman',
      });
    } else if (token === 'xyz123456') {
      return Promise.resolve({
        id: 2,
        name: 'Thor',
      });
    } else if (token === 'def123456') {
      response.setHeader('some-header', 'someValueFromAuthenticationMiddleware');
      return Promise.resolve({});
    } else if (token === 'ghi123456') {
      response.status(401).send('some custom response');
      return Promise.resolve();
    } else {
      return Promise.reject({ message: 'api_key' });
    }
  } else {
    if (req.query && req.query.tsoa && req.query.tsoa === 'abc123456') {
      return Promise.resolve({});
    } else if (req.query && req.query.tsoa === 'slow-invalid') {
      return new Promise((_, reject) => setTimeout(() => reject({ message: 'other' }), 10));
    } else if (req.query && req.query.tsoa === 'slow-custom-response') {
      return new Promise((_, reject) =>
        setTimeout(() => {
          response.status(403).send('some custom response');
          reject({ message: 'other' });
        }, 10),
      );
    } else if (req.query && req.query.tsoa === 'slow-custom-response-missing') {
      return new Promise((_, reject) =>
        setTimeout(() => {
          response.status(403).send('some custom response');
          reject(new MissingCredentialsError('other'));
        }, 10),
      );
    } else if (req.query && req.query.tsoa === 'null-rejection') {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- rejects with a non-Error value on purpose
      return Promise.reject(null);
    } else if (req.query && req.query.tsoa === 'string-rejection') {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- rejects with a non-Error value on purpose
      return Promise.reject('denied');
    } else if (req.query && req.query.tsoa) {
      return Promise.reject({ message: 'other' });
    } else {
      return Promise.reject(new MissingCredentialsError('other'));
    }
  }
}
