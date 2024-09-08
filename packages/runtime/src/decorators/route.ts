export function Route(name?: string): ClassDecorator {
  return () => {
    return;
  };
}

/**
 * can be used to entirely hide an method from documentation
 */
export function Hidden(): ClassDecorator & MethodDecorator {
  return () => {
    return;
  };
}
