import type { RequestHandler as ExpressMiddleware } from 'express';
import type { Middleware as KoaMiddleware } from 'koa';
import type { RouteOptionsPreArray as HapiMiddlewares } from 'hapi';

export type Middlewares = {
  express?: ExpressMiddleware[];
  koa?: KoaMiddleware[];
  hapi?: HapiMiddlewares;
};

const TSOA_EXPRESS_MIDDLEWARES = Symbol('tsoa:expressMiddlewares');
const TSOA_KOA_MIDDLEWARES = Symbol('tsoa:koaMiddlewares');
const TSOA_HAPI_MIDDLEWARES = Symbol('tsoa:hapiMiddlewares');

/**
 * Helper function to create a decorator
 * that can act as a class and method decorator.
 * @param fn a callback function that accepts
 *           the subject of the decorator
 *           either the constructor or the
 *           method
 * @returns
 */
function decorator(fn: (value: any) => void): ClassDecorator & MethodDecorator {
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

function installMiddlewares(target: any, key: symbol, value?: any): void {
  if (!value) {
    return;
  }

  Reflect.defineMetadata(key, value, target);
}

/**
 * Install `express`, `koa` and `hapi` middlewares
 * to the Controller or a specific method.
 * @param middlewares
 * @returns
 */
export function Middlewares(middlewares: Middlewares) {
  return decorator(target => {
    installMiddlewares(target, TSOA_EXPRESS_MIDDLEWARES, middlewares.express);
    installMiddlewares(target, TSOA_KOA_MIDDLEWARES, middlewares.koa);
    installMiddlewares(target, TSOA_HAPI_MIDDLEWARES, middlewares.hapi);
  });
}

/**
 * Install `express` middlewares to the Controller or a specific method.
 * @param middlewares
 * @returns
 */
export function ExpressMiddlewares(...middlewares: ExpressMiddleware[]) {
  return decorator(target => {
    installMiddlewares(target, TSOA_EXPRESS_MIDDLEWARES, middlewares);
  });
}

/**
 * Install `koa` middlewares to the Controller or a specific method.
 * @param middlewares
 * @returns
 */
export function KoaMiddlewares(...middlewares: KoaMiddleware[]) {
  return decorator(target => {
    installMiddlewares(target, TSOA_KOA_MIDDLEWARES, middlewares);
  });
}

/**
 * Install `hapi` middlewares to the Controller or a specific method.
 * @param middlewares
 * @returns
 */
export function HapiMiddlewares(...middlewares: HapiMiddlewares) {
  return decorator(target => {
    installMiddlewares(target, TSOA_HAPI_MIDDLEWARES, middlewares);
  });
}

/**
 * Internal function used to retrieve installed middlewares
 * in controller and methods
 * @param target
 * @returns list of express middlewares
 */
export function fetchExpressMiddlewares(target: any) {
  return Reflect.getMetadata(TSOA_EXPRESS_MIDDLEWARES, target) || [];
}

/**
 * Internal function used to retrieve installed middlewares
 * in controller and methods
 * @param target
 * @returns list of koa middlewares
 */
export function fetchKoaMiddlewares(target: any) {
  return Reflect.getMetadata(TSOA_KOA_MIDDLEWARES, target) || [];
}

/**
 * Internal function used to retrieve installed middlewares
 * in controller and methods
 * @param target
 * @returns list of hapi middlewares
 */
export function fetchHapiMiddlewares(target: any) {
  return Reflect.getMetadata(TSOA_HAPI_MIDDLEWARES, target) || [];
}
