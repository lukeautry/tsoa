import { Get, Route } from '@tsoa/runtime';
import { Keep, Leaf, Optional } from './models';

@Route('synthetic-children')
export class ExactNullInnerFirstController {
  @Get()
  public get(): Keep<{ lit: { inner?: Optional<Leaf> | null; plain?: Optional<Leaf> } }> {
    return { lit: {} };
  }
}
