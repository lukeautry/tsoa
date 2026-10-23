import { Get, Route } from '@tsoa/runtime';

interface Nested {
  value: string;
  count: number;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> & { marker?: boolean } : T[K] };

interface Target {
  nested: Nested;
}

@Route('type-context')
export class IntersectionController {
  @Get()
  public get(): DeepPartial<Target> {
    return {};
  }
}
