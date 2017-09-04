export function Route(name?: string): any {
  return () => { return; };
}

/**
 * can be used to entirely hide an method from documentation
 */
export function Hidden(): any {
  return () => { return; };
}

/**
 * Marks controller or method to be generated in private Swagger file
 * @return {any}
 * @constructor
 */
export function Internal(): any {
  return () => { return; };
}
