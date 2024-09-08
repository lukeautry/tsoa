/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Middleware<T extends Function | object> = T;

const TSOA_MIDDLEWARES = Symbol('@tsoa:middlewares');

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
 * Install middlewares to the Controller or a specific method.
 * @param middlewares
 * @returns
 */
export function Middlewares<T extends Function | object>(...mws: Array<Middleware<T>>): ClassDecorator & MethodDecorator {
  return decorator(target => {
    if (mws) {
      const current = fetchMiddlewares<T>(target);
      Reflect.defineMetadata(TSOA_MIDDLEWARES, [...current, ...mws], target);
    }
  });
}

/**
 * Internal function used to retrieve installed middlewares
 * in controller and methods (used during routes generation)
 * @param target
 * @returns list of middlewares
 */
export function fetchMiddlewares<T extends Function | object>(target: any): Array<Middleware<T>> {
  return Reflect.getMetadata(TSOA_MIDDLEWARES, target) || [];
}
