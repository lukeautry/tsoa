import { Get, Route } from '@tsoa/runtime';
import { Deep, Leaf } from './models';

interface ArrayOnly {
  list: Array<Leaf>;
}

@Route('type-context-boundaries')
export class ArrayOnlyController {
  @Get()
  public get(): Deep<ArrayOnly> {
    return {};
  }
}
