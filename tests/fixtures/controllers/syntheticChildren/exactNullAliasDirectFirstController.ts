import { Get, Route } from '@tsoa/runtime';
import { Keep, Leaf, P } from './models';

@Route('synthetic-children')
export class ExactNullAliasDirectFirstController {
  @Get()
  public get(): Keep<{ direct: P<Leaf | null>; lit: { x?: P<Leaf | null> } }> {
    return { lit: {}, direct: {} };
  }
}
