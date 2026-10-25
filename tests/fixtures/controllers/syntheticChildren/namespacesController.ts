import { Get, Route } from '@tsoa/runtime';

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace First {
  export interface Nested {
    a: string;
  }

  export type Optional<T> = { [K in keyof T]?: T[K] };
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Second {
  export interface Nested {
    b: number;
  }

  export type Optional<T> = { [K in keyof T]?: T[K] };
}

interface Container {
  value: First.Optional<First.Nested> | Second.Optional<Second.Nested>;
}

@Route('synthetic-children')
export class NamespacesController {
  @Get()
  public get(): Partial<Container> {
    return {};
  }
}
