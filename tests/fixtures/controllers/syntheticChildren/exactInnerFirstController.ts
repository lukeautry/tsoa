import { Get, Route } from '@tsoa/runtime';
import { Keep, Optional } from './models';

interface Leaf {
  text: string;
}

@Route('synthetic-children')
export class ExactInnerFirstController {
  @Get()
  public get(): Keep<{ lit: { inner?: Optional<Leaf>; second: Optional<Leaf> } }> {
    return { lit: { second: {} } };
  }
}
