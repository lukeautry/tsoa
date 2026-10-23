import { Get, Route } from '@tsoa/runtime';

type Keep<T> = { [K in keyof T]: T[K] };

interface Box<T> {
  value: T;
}

interface Target {
  value:
    | Box<{
        /** Integer property description.
         * @isInt
         * @default 3
         */
        value: number;
      }>
    | Box<{
        /** Float property description.
         * @isFloat
         * @default 4.5
         */
        value: number;
      }>;
}

@Route('type-context-boundaries')
export class AnonymousViewsController {
  @Get('anonymous-computed')
  public computed(): Keep<Target> {
    return { value: { value: { value: 0 } } };
  }

  @Get('anonymous-source')
  public source(): Target {
    return { value: { value: { value: 0 } } };
  }
}
