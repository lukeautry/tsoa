import { Get, Route } from '@tsoa/runtime';
import { Leaf, Optional as Opt } from './models';
import { Opt as Other } from './other';

type Lookup = { [key: string]: Opt<Leaf> | Other<Leaf> };

@Route('synthetic-children')
export class IndexedUnionController {
  @Get()
  public get(): Lookup[string] {
    return {};
  }
}
