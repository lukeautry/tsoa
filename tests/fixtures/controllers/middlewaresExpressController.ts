import { Route, Get, Middlewares as GenericMiddlewares } from '@tsoa/runtime';

import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction, RequestHandler } from 'express';

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
  @Middlewares(testMiddleware('test1'))
  @Get('/test1')
  public async test1(): Promise<void> {
    return;
  }
}
