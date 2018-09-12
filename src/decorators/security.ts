import { MethodDecoratorReturn } from '../interfaces/decorator-return';

/**
 * @param {name} security name from securityDefinitions
 */
export function Security(name: string | { [name: string]: string[] }, scopes?: string[]): MethodDecoratorReturn {
  return () => { return; };
}
