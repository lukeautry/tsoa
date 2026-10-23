import { Get, Route } from '@tsoa/runtime';

interface Leaf {
  value: string;
}

type Optional<T> = { [K in keyof T]?: T[K] };
type Joined<T> = Optional<T> & { marker: boolean };

@Route('source-occurrences')
export class IntersectionController {
  @Get()
  public get(): Joined<Leaf> {
    return { marker: true };
  }
}
