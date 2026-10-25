import { Get, Route } from '@tsoa/runtime';
import { Keep, Optional } from './models';

interface Leaf {
  text: string;
}

@Route('synthetic-children')
export class ComputedNameController {
  @Get()
  public get(): Keep<{ value: { [Symbol.toStringTag]: 'x'; child: Optional<Leaf> } }> {
    return { value: { [Symbol.toStringTag]: 'x', child: {} } };
  }
}
