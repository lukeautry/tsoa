import * as express from 'express';

export function expressAuthentication(req: express.Request, name: string, scopes?: string[]): Promise<any> {
    let token;
    if (req.query && req.query.access_token) {
        token = req.query.access_token;
    } else {
        return Promise.reject({});
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
        return Promise.reject({});
    }
}
