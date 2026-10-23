import { Get, Route } from '@tsoa/runtime';

interface Leaf {
  value: string;
}

type Optional<T> = { [K in keyof T]?: T[K] };
type Maybe<T> = Optional<T> | null;

@Route('source-occurrences')
export class UnionController {
  @Get()
  public get(): Maybe<Leaf> {
    return {};
  }
}
