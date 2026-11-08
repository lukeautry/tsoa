import { Body, Post, Route } from '@tsoa/runtime';

/** @pattern ^x */
type Identifier = string;
/** @pattern ^y */
type OtherIdentifier = string;

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
  @Post('arrays')
  public arrays(@Body() body: Box<Identifier, OtherIdentifier>): void {}

  @Post('items')
  public items(@Body() body: ItemBox<Identifier, OtherIdentifier>): void {}

  @Post('distinct')
  public distinct(@Body() body: DistinctBox<Identifier, number>): void {}
}
