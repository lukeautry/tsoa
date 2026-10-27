import { Get, Route } from '@tsoa/runtime';
import { Keep, Optional } from './models';

interface Leaf {
  text: string;
}

@Route('synthetic-children')
export class ExactSecondFirstController {
  @Get()
  public get(): Keep<{ lit: { second: Optional<Leaf>; inner?: Optional<Leaf> } }> {
    return { lit: { second: {} } };
  }
}
