import { Get, Route } from '@tsoa/runtime';
import { Keep, Leaf, Optional } from './models';

@Route('synthetic-children')
export class ExactTupleFirstController {
  @Get()
  public get(): Keep<{ t: Partial<[a: Optional<Leaf>, b: number]>; direct: Optional<Leaf> }> {
    return { t: [], direct: {} };
  }
}
