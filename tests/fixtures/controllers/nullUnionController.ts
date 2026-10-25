import { Body, Post, Route } from '@tsoa/runtime';

type NullAlias = null;
type IndirectNull = NullAlias;
type NestedAlias = string | NullAlias;

interface NullUnionBody {
  direct: boolean | null;
  alias: boolean | NullAlias;
  indirect: boolean | IndirectNull;
  nested: boolean | NestedAlias;
  values: Array<boolean | NullAlias>;
}

@Route('NullUnion')
export class NullUnionController {
  @Post()
  public post(@Body() body: NullUnionBody): NullUnionBody {
    return body;
  }
}
