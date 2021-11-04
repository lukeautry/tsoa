export type ExpressMiddleware = (req: any, res: any, next: any) => Promise<any>;
export type KoaMiddleware = (ctx: any, next: any) => Promise<any>;
export type HapiMiddlewareBase = (request: any, h: any) => Promise<any>;
export type HapiMiddlewareSimple = HapiMiddlewareBase | { method: HapiMiddlewareBase; assign?: string; failAction?: HapiMiddlewareBase | string };
export type HapiMiddleware = HapiMiddlewareSimple | HapiMiddlewareSimple[];

export type Middlewares = {
  express?: ExpressMiddleware[];
  koa?: KoaMiddleware[];
  hapi?: HapiMiddleware[];
};

/**
 * Helper function to create a decorator
 * that can act as a class and method decorator.
 * @param fn a callback function that accepts
 *           the subject of the decorator
 *           either the constructor or the
 *           method
 * @returns
 */
function decorator(fn: (value: any) => void) {
  return (...args: any[]) => {
    // class decorator
    if (args.length === 1) {
      fn(args[0]);
    } else if (args.length === 3 && args[2].value) {
      // method decorator
      const descriptor = args[2] as PropertyDescriptor;
      if (descriptor.value) {
        fn(descriptor.value);
      }
    }
  };
}

/**
 * Install `express`, `koa` and `hapi` middlewares
 * to the Controller or a specific method.
 * @param middlewares
 * @returns
 */
export function Middlewares(middlewares: Middlewares) {
  return decorator(target => {
    target._expressMiddlewares = middlewares.express || [];
    target._koaMiddlewares = middlewares.koa || [];
    target._hapiMiddlewares = middlewares.hapi || [];
  });
}

/**
 * Install `express` middlewares to the Controller or a specific method.
 * @param middlewares
 * @returns
 */
export function ExpressMiddlewares(...middlewares: ExpressMiddleware[]) {
  return decorator(target => {
    target._expressMiddlewares = middlewares;
  });
}

/**
 * Install `koa` middlewares to the Controller or a specific method.
 * @param middlewares
 * @returns
 */
export function KoaMiddlewares(...middlewares: KoaMiddleware[]) {
  return decorator(target => {
    target._koaMiddlewares = middlewares;
  });
}

/**
 * Install `hapi` middlewares to the Controller or a specific method.
 * @param middlewares
 * @returns
 */
export function HapiMiddlewares(...middlewares: HapiMiddleware[]) {
  return decorator(target => {
    target._hapiMiddlewares = middlewares;
  });
}
