import { Get, Route } from '@tsoa/runtime';
import { Deep, Leaf, Left, Right } from './models';

interface Target {
  // eslint-disable-next-line @typescript-eslint/array-type
  list: Array<Leaf>;
  plainList: Leaf[];
  readonlyList: readonly Leaf[];
  // eslint-disable-next-line @typescript-eslint/array-type
  readonlyGenericList: ReadonlyArray<Leaf>;
  nested: Leaf;
  joint: Left & Right;
}

@Route('synthetic-children')
export class OrderArrayFirstController {
  @Get()
  public get(): Deep<Target> {
    return {};
  }
}
