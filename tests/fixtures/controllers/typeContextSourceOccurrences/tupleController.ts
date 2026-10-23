import { Get, Route } from '@tsoa/runtime';

interface Leaf {
  value: string;
}

type Optional<T> = { [K in keyof T]?: T[K] };
type Entries<T> = readonly [Optional<T>, Array<Optional<T>>];
type Rest<T> = readonly [Optional<T>, ...Array<Array<Optional<T>>>];

@Route('source-occurrences')
export class TupleController {
  @Get('entries')
  public entries(): Entries<Leaf> {
    return [{}, [{}]];
  }

  @Get('rest')
  public rest(): Rest<Leaf> {
    return [{}, [{}]];
  }
}
