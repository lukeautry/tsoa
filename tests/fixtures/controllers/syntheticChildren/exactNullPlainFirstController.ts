import { Get, Route } from '@tsoa/runtime';
import { Keep, Leaf, Optional } from './models';

@Route('synthetic-children')
export class ExactNullPlainFirstController {
  @Get()
  public get(): Keep<{ lit: { plain?: Optional<Leaf>; inner?: Optional<Leaf> | null } }> {
    return { lit: {} };
  }
}
