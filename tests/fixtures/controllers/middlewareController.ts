import { Route, Get, Middlewares, ExpressMiddlewares, KoaMiddlewares, HapiMiddlewares } from '@tsoa/runtime';

import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';

import type { Context as KoaContext, Next as KoaNext } from 'koa';

import type { Request as HapiRequest, ResponseToolkit as HapiResponseToolkit } from 'hapi';

const middlewaresState = {
  express: {},
  koa: {},
  hapi: {},
};

export function stateOf(serverType: 'express' | 'koa' | 'hapi', key: string): boolean | undefined {
  return middlewaresState[serverType][key];
}

function testMiddlewareExpress(key: string) {
  return async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
    middlewaresState.express[key] = true;
    next();
  };
}
function testMiddlewareKoa(key: string) {
  return async (ctx: KoaContext, next: KoaNext) => {
    middlewaresState.koa[key] = true;
    next();
  };
}
function testMiddlewareHapi(key: string) {
  return async (request: HapiRequest, h: HapiResponseToolkit) => {
    middlewaresState.hapi[key] = true;
    return key;
  };
}

@Middlewares({
  express: [testMiddlewareExpress('route')],
  koa: [testMiddlewareKoa('route')],
  hapi: [testMiddlewareHapi('route')],
})
@Route('MiddlewareTest')
export class MiddlewareTestController {
  @ExpressMiddlewares(testMiddlewareExpress('test1'))
  @KoaMiddlewares(testMiddlewareKoa('test1'))
  @HapiMiddlewares(testMiddlewareHapi('test1'))
  @Get('/test1')
  public async test1(): Promise<void> {
    return;
  }
}
