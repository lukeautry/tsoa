import { MethodDecoratorReturn } from '../interfaces/decorator-return';

export function Get(value?: string): MethodDecoratorReturn {
  return () => { return; };
}

export function Post(value?: string): MethodDecoratorReturn {
  return () => { return; };
}

export function Put(value?: string): MethodDecoratorReturn {
  return () => { return; };
}

export function Patch(value?: string): MethodDecoratorReturn {
  return () => { return; };
}

export function Delete(value?: string): MethodDecoratorReturn {
  return () => { return; };
}
