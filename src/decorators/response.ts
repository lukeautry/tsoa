import { MethodDecoratorReturn } from '../interfaces/decorator-return';

export function SuccessResponse(name: string | number, description?: string): MethodDecoratorReturn {
  return () => { return; };
}

export function Response<T>(name: string | number, description?: string, example?: T): MethodDecoratorReturn {
  return () => { return; };
}
