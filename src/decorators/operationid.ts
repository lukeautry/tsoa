import { MethodDecoratorReturn } from '../interfaces/decorator-return';

export function OperationId(value: string): MethodDecoratorReturn {
  return () => { return; };
}
