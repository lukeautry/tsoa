import { Body, Post, Route } from '@tsoa/runtime';

interface NullDefaultObjectA {
  /** @default null */
  kind: 'null';
}

interface NullDefaultObjectB {
  kind: 'B';
}

type NullDefaultObjectUnion = NullDefaultObjectA | NullDefaultObjectB;

type NullDefaultInlineA = {
  /** @default null */
  kind: 'null';
};

type NullDefaultInlineB = {
  kind: 'B';
};

type NullDefaultInlineUnion = NullDefaultInlineA | NullDefaultInlineB;

@Route('union-defaults')
export class UnionDiscriminatorDefaultsController {
  @Post('object')
  public object(@Body() body: NullDefaultObjectUnion): NullDefaultObjectUnion {
    return body;
  }

  @Post('inline')
  public inline(@Body() body: NullDefaultInlineUnion): NullDefaultInlineUnion {
    return body;
  }
}
