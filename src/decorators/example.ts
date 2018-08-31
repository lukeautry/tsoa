import { MethodDecoratorReturn } from '../interfaces/decorator-return';

export function Example<T>(exampleModel: T): MethodDecoratorReturn {
  return () => { return; };
}
