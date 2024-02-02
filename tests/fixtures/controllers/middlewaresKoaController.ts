import { Route } from '@tsoa/runtime/decorators/route';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Middlewares as GenericMiddlewares } from '@tsoa/runtime';

import type { Context as KoaContext, Next as KoaNext, Middleware } from 'koa';

function Middlewares(...mws: Middleware[]) {
  return GenericMiddlewares<Middleware>(...mws);
}

const middlewaresState: Record<string, boolean> = {};

export function stateOf(key: string): boolean | undefined {
  return middlewaresState[key];
}

function testMiddleware(key: string) {
  return async (ctx: KoaContext, next: KoaNext) => {
    middlewaresState[key] = true;
    next();
  };
}

@GenericMiddlewares<Middleware>(testMiddleware('route'))
@Route('MiddlewareTestKoa')
export class MiddlewareKoaController {
  @Middlewares(testMiddleware('test1'))
  @Get('/test1')
  public async test1(): Promise<void> {
    return;
  }
}
