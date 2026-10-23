/**
 * Can be used to indicate that a method requires no security.
 */
export function NoSecurity(): ClassDecorator & MethodDecorator {
  return () => {
    return;
  };
}

/**
 * Multiple `@Security` decorators are alternatives (OR); an object with several names requires all of them (AND).
 * `@Security({})` adds an empty entry, which makes authentication optional (`security: [{ bearerAuth: [] }, {}]`).
 * Requests without credentials then continue with `request.user` undefined, provided your authentication
 * function rejects with `MissingCredentialsError` when the credentials are absent. Any other rejection
 * (e.g. an invalid token) is still answered with 401.
 * An AND group with some valid and some missing credentials counts as missing credentials, so `{}` applies
 * and the request continues anonymously (the partially authenticated user is not passed on).
 *
 * @param {name} security name from securityDefinitions
 */
export function Security(name: string | { [name: string]: string[] }, scopes?: string[]): ClassDecorator & MethodDecorator {
  return () => {
    return;
  };
}
