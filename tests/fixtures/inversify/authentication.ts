import * as express from 'express';

export function expressAuthentication(req: express.Request, _name: string, _scopes: string[] | undefined, res: express.Response): Promise<any> {
  if (req.query && req.query.tsoa && req.query.tsoa === 'abc123456') {
    return Promise.resolve({});
  } else {
    return Promise.reject({});
  }
}
