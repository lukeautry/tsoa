import { Body, Post, Route } from '@tsoa/runtime';

/** @pattern ^x */
type Identifier = string;
/** @pattern ^y */
type OtherIdentifier = string;

/** @minimum 10 */
type Minimum = number;

/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-duplicate-type-constituents -- Written alternatives retain validators even when the checker collapses them. */
interface LiteralAlternatives {
  stringAliasFirst: Identifier | 'yellow';
  stringLiteralFirst: 'yellow' | Identifier;
  numberAliasFirst: Minimum | 7;
  numberLiteralFirst: 7 | Minimum;
  aliases: Identifier | OtherIdentifier;
  reversedAliases: OtherIdentifier | Identifier;
  stringFirst: string | 'yellow';
  literalBeforeString: 'yellow' | string;
  numberFirst: number | 7;
  literalBeforeNumber: 7 | number;
}
/* eslint-enable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-duplicate-type-constituents */

interface Box<L, R> {
  value: L[] | R[];
}

interface Item<T> {
  value: T;
}

interface ItemBox<L, R> {
  value: Item<L> | Item<R>;
}

interface DistinctBox<L, R> {
  arrays: L[] | R[] | boolean[];
  items: Item<L> | Item<R> | Item<boolean>;
}

@Route('union-candidates')
export class UnionCandidatesController {
  @Post('literals')
  public literals(@Body() body: LiteralAlternatives): void {}

  @Post('arrays')
  public arrays(@Body() body: Box<Identifier, OtherIdentifier>): void {}

  @Post('items')
  public items(@Body() body: ItemBox<Identifier, OtherIdentifier>): void {}

  @Post('distinct')
  public distinct(@Body() body: DistinctBox<Identifier, number>): void {}
}
