import { Get, Route } from '@tsoa/runtime';
import { Leaf, Optional } from './models';

@Route('type-context-boundaries')
export class PromiseController {
  @Get()
  public get(): Promise<Array<Optional<Leaf>>> {
    return Promise.resolve([{}]);
  }
}
