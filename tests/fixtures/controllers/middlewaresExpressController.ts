import { Middlewares as GenericMiddlewares, Get, Route } from '@tsoa/runtime';

import type { NextFunction as ExpressNextFunction, Request as ExpressRequest, Response as ExpressResponse, RequestHandler } from 'express';

function Middlewares(...mws: Array<RequestHandler | (() => Promise<RequestHandler>)>) {
  return GenericMiddlewares(...mws);
}

const middlewaresState: Record<string, boolean> = {};

export function stateOf(key: string): boolean | undefined {
  return middlewaresState[key];
}

function testMiddleware(key: string) {
  return async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
    middlewaresState[key] = true;
    next();
  };
}

@GenericMiddlewares<RequestHandler>(testMiddleware('route'))
@Route('MiddlewareTestExpress')
export class MiddlewareExpressController {
  @Middlewares(testMiddleware('test1'), testMiddleware('test2'))
  @Get('/test1')
  public async test1(): Promise<void> {
    return;
  }
}
