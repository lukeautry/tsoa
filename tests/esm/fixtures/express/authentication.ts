import * as express from 'express';

export function expressAuthentication(req: express.Request, name: string, _scopes: string[] | undefined, response: express.Response): Promise<any> {
  if (name === 'api_key') {
    let token;
    if (req.query && req.query.access_token) {
      token = req.query.access_token;
    } else {
      return Promise.reject({ message: 'api_key' });
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
    } else if (token === 'dfe1234556') {
      response.setHeader('someHeader', 'someValueFromAuthenticationMiddleware');
      return Promise.resolve({});
    } else {
      return Promise.reject({ message: 'api_key' });
    }
  } else {
    if (req.query && req.query.tsoa && req.query.tsoa === 'abc123456') {
      return Promise.resolve({});
    } else {
      return Promise.reject({ message: 'other' });
    }
  }
}
