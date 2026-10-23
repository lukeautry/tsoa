import { Get, Route } from '@tsoa/runtime';

type Keep<T> = { [K in keyof T]: T[K] };

interface Target {
  value: string[] | number[];
}

@Route('type-context-boundaries')
export class UnionArrayController {
  @Get('array-union')
  public arrayUnion(): Keep<Target> {
    return { value: [] };
  }
}
