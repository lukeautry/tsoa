import { Get, Route } from '@tsoa/runtime';

interface Leaf {
  text: string;
  count: number;
}

interface Box<T> {
  item: T;
}

interface Wrapper<T> {
  value?: Box<T>;
}

@Route('source-occurrences')
export class OptionalWrapperController {
  @Get()
  public get(): Wrapper<Leaf> {
    return {};
  }
}
