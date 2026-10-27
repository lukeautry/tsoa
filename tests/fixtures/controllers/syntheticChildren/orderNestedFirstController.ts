import { Get, Route } from '@tsoa/runtime';
import { Deep, Leaf, Left, Right } from './models';

interface Target {
  nested: Leaf;
  joint: Left & Right;
  // eslint-disable-next-line @typescript-eslint/array-type
  readonlyGenericList: ReadonlyArray<Leaf>;
  readonlyList: readonly Leaf[];
  plainList: Leaf[];
  // eslint-disable-next-line @typescript-eslint/array-type
  list: Array<Leaf>;
}

@Route('synthetic-children')
export class OrderNestedFirstController {
  @Get()
  public get(): Deep<Target> {
    return {};
  }
}
