import { Get, Route } from '@tsoa/runtime';
import { Keep, Leaf, Optional } from './models';

@Route('synthetic-children')
export class ExactDirectFirstController {
  @Get()
  public get(): Keep<{ direct: Optional<Leaf>; t: Partial<[a: Optional<Leaf>, b: number]> }> {
    return { t: [], direct: {} };
  }
}
