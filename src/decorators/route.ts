import { ClassDecoratorReturn, MethodDecoratorReturn } from '../interfaces/decorator-return';

export function Route(name?: string): ClassDecoratorReturn {
  return () => { return; };
}

/**
 * can be used to entirely hide an method from documentation
 */
export function Hidden(): MethodDecoratorReturn {
  return () => { return; };
}
