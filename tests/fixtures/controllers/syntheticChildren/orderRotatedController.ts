import { Get, Route } from '@tsoa/runtime';
import { Deep, Leaf, Left, Right } from './models';

interface Target {
  readonlyList: readonly Leaf[];
  nested: Leaf;
  // eslint-disable-next-line @typescript-eslint/array-type
  list: Array<Leaf>;
  plainList: Leaf[];
  joint: Left & Right;
  // eslint-disable-next-line @typescript-eslint/array-type
  readonlyGenericList: ReadonlyArray<Leaf>;
}

@Route('synthetic-children')
export class OrderRotatedController {
  @Get()
  public get(): Deep<Target> {
    return {};
  }
}
