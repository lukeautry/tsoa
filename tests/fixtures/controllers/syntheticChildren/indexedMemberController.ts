import { Get, Route } from '@tsoa/runtime';
import { Leaf, Optional as Opt } from './models';
import { Opt as Other } from './other';

type Lookup = { [key: string]: { first: Opt<Leaf>; second: Other<Leaf> } };

@Route('synthetic-children')
export class IndexedMemberController {
  @Get()
  public get(): Lookup[string] {
    return { first: {}, second: {} };
  }
}
