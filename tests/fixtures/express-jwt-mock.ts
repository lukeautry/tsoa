import { RequestHandler, Request, Response, NextFunction } from 'express-serve-static-core';
import { set } from 'lodash';
export interface Options {
    userProperty?: string;
}

export function jwt(options: Options): RequestHandler {
    let requestProperty = options.userProperty || 'user';
    let middleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
        set(req, requestProperty, {aud: '1', iss: '1', sub: '1'});
        next();
    };

    return middleware;
}
