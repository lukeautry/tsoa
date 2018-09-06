import { MethodDecoratorReturn } from '../interfaces/decorator-return';

export function Tags(...values: string[]): MethodDecoratorReturn {
  return () => { return; };
}
