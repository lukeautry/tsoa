import { Middlewares as GenericMiddlewares, Get, QueryParam, Route, Security } from '@tsoa/runtime';

import type { preHandlerHookHandler } from 'fastify';

function Middlewares(...mws: preHandlerHookHandler[]) {
  return GenericMiddlewares<preHandlerHookHandler>(...mws);
}

const middlewaresState: Record<string, boolean> = {};

export function stateOf(key: string): boolean | undefined {
  return middlewaresState[key];
}

function testMiddleware(key: string): preHandlerHookHandler {
  return (request, reply, done) => {
    middlewaresState[key] = true;
    done();
  };
}

@GenericMiddlewares<preHandlerHookHandler>(testMiddleware('route'))
@Route('MiddlewareTestFastify')
export class MiddlewareFastifyController {
  @Middlewares(testMiddleware('test1'), testMiddleware('test2'))
  @Get('/test1')
  public async test1(): Promise<void> {
    return;
  }

  @Security('api_key')
  @Middlewares(testMiddleware('secured'))
  @Get('/secured')
  public async secured(@QueryParam() access_token: string): Promise<{ token: string }> {
    middlewaresState.securedController = true;
    return { token: access_token };
  }
}

export function resetState(): void {
  for (const key of Object.keys(middlewaresState)) delete middlewaresState[key];
}
