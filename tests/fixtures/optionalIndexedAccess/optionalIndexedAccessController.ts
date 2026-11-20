import { Body, Post, Route } from '@tsoa/runtime';

interface Inner {
  a?: string;
}

/** @pattern ^x */
type Identifier = string;

type InnerAlias = { b?: string };

type Maybe = Inner | null;

interface Box<T> {
  value: T;
}

/** Optional properties, read below through indexed access types. */
interface Source {
  inner?: Inner;
  id?: Identifier;
  alias?: InnerAlias;
  maybe?: Maybe;
  list?: Inner[];
}

/** Each model is used both directly and through `Source[...]`, which adds the `undefined` of optionality. */
interface IndexedAccess {
  direct?: Inner;
  viaIndex?: Source['inner'];
  requiredViaIndex: Source['inner'];
  id: Identifier;
  idViaIndex: Source['id'];
  aliasViaIndex: Source['alias'];
  maybe?: Maybe;
  maybeViaIndex?: Source['maybe'];
  elements?: Array<Source['inner']>;
  list?: Source['list'];
  boxed?: Box<Source['inner']>;
}

@Route('OptionalIndexedAccess')
export class OptionalIndexedAccessController {
  @Post()
  public post(@Body() body: IndexedAccess): void {}
}
