/**
 * Can be used to indicate that a method requires no security.
 */
export function NoSecurity(): Function {
  return () => {
    return;
  };
}

/**
 * @param {name} security name from securityDefinitions
 */
export function Security(name: string | { [name: string]: string[] }, scopes?: string[]): Function {
  return () => {
    return;
  };
}
