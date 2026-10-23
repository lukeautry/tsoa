import { Get, Route } from '@tsoa/runtime';

namespace First {
  export interface Nested {
    a: string;
  }

  export type Optional<T> = { [K in keyof T]?: T[K] };
}

namespace Second {
  export interface Nested {
    b: number;
  }

  export type Optional<T> = { [K in keyof T]?: T[K] };
}

interface Container {
  value: First.Optional<First.Nested> | Second.Optional<Second.Nested>;
}

@Route('type-context')
export class NamespaceUnionController {
  @Get()
  public get(): Partial<Container> {
    return {};
  }
}
