import { MissingCredentialsError } from '@tsoa/runtime';
import { Request, Response } from 'koa';

export function koaAuthentication(request: Request, name: string, scopes: string[] | undefined, response: Response): Promise<any> {
  if (name === 'api_key') {
    let token;
    if (request.query && request.query.access_token) {
      token = request.query.access_token;
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
      response.set('some-header', 'someValueFromAuthenticationMiddleware');
      return Promise.resolve({});
    } else if (token === 'ghi123456') {
      response.status = 401;
      response.body = 'some custom response';
      return Promise.resolve();
    } else if (token === 'never-settles') {
      return new Promise(() => undefined);
    } else if (token === 'frozen') {
      return Promise.reject(Object.freeze(new Error('api_key')));
    } else if (token === 'frozen-status') {
      return Promise.reject(Object.freeze(Object.assign(new Error('api_key'), { status: 403 })));
    } else {
      return Promise.reject({ message: 'api_key' });
    }
  } else if (name === 'slow_auth') {
    return new Promise((_, reject) => setTimeout(() => reject({ message: 'slow_auth' }), 10000));
  } else {
    if (request.query && request.query.tsoa && request.query.tsoa === 'abc123456') {
      return Promise.resolve({});
    } else if (request.query && request.query.tsoa === 'slow-invalid') {
      return new Promise((_, reject) => setTimeout(() => reject({ message: 'other' }), 10));
    } else if (request.query && request.query.tsoa === 'slow-custom-response') {
      return new Promise((_, reject) =>
        setTimeout(() => {
          response.status = 403;
          response.body = 'some custom response';
          reject({ message: 'other' });
        }, 10),
      );
    } else if (request.query && request.query.tsoa === 'slow-custom-response-missing') {
      return new Promise((_, reject) =>
        setTimeout(() => {
          response.status = 403;
          response.body = 'some custom response';
          reject(new MissingCredentialsError('other'));
        }, 10),
      );
    } else if (request.query && request.query.tsoa === 'status-only-missing') {
      response.status = 403;
      return Promise.reject(new MissingCredentialsError('other'));
    } else if (request.query && request.query.tsoa === 'slow-status-missing') {
      return new Promise((_, reject) =>
        setTimeout(() => {
          response.status = 403;
          reject(new MissingCredentialsError('other'));
        }, 10),
      );
    } else if (request.query && request.query.tsoa === 'empty-body-missing') {
      response.status = 403;
      response.body = '';
      return Promise.reject(new MissingCredentialsError('other'));
    } else if (request.query && request.query.tsoa === 'false-body-missing') {
      response.status = 403;
      response.body = false;
      return Promise.reject(new MissingCredentialsError('other'));
    } else if (request.query && request.query.tsoa === 'zero-body-missing') {
      response.status = 403;
      response.body = 0;
      return Promise.reject(new MissingCredentialsError('other'));
    } else if (request.query && request.query.tsoa === 'named-error') {
      return Promise.reject(Object.assign(new Error('other'), { name: 'MissingCredentialsError' }));
    } else if (request.query && request.query.tsoa === 'null-rejection') {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- rejects with a non-Error value on purpose
      return Promise.reject(null);
    } else if (request.query && request.query.tsoa === 'string-rejection') {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- rejects with a non-Error value on purpose
      return Promise.reject('denied');
    } else if (request.query && request.query.tsoa) {
      return Promise.reject({ message: 'other' });
    } else {
      return Promise.reject(new MissingCredentialsError('other'));
    }
  }
}
