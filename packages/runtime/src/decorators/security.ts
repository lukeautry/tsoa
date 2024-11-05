/**
 * Can be used to indicate that a method requires no security.
 */
export function NoSecurity(): ClassDecorator & MethodDecorator {
  return () => {
    return;
  };
}

/**
 * @param {name} security name from securityDefinitions
 */
export function Security(name: string | { [name: string]: string[] }, scopes?: string[]): ClassDecorator & MethodDecorator {
  return () => {
    return;
  };
}
