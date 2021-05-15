import { Request } from 'koa';

export function koaAuthentication(request: Request, name: string, scopes?: string[]): Promise<any> {
  if (name === 'api_key') {
    let token;
    if (request.query && request.query.access_token) {
      token = request.query.access_token;
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
    } else {
      return Promise.reject({ message: 'api_key' });
    }
  } else if (name === 'slow_auth') {
    return new Promise((_, reject) => setTimeout(() => reject({ message: 'slow_auth' }), 10000));
  } else {
    if (request.query && request.query.tsoa && request.query.tsoa === 'abc123456') {
      return Promise.resolve({});
    } else {
      return Promise.reject({ message: 'other' });
    }
  }
}
