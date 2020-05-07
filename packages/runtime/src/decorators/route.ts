export function Route(name?: string): Function {
  return () => {
    return;
  };
}

/**
 * can be used to entirely hide an method from documentation
 */
export function Hidden(): Function {
  return () => {
    return;
  };
}
