import { Get, Route } from '@tsoa/runtime';
import { Keep, Leaf, P } from './models';

@Route('synthetic-children')
export class ExactNullAliasLitFirstController {
  @Get()
  public get(): Keep<{ lit: { x?: P<Leaf | null> }; direct: P<Leaf | null> }> {
    return { lit: {}, direct: {} };
  }
}
