import { Get, Route } from '@tsoa/runtime';
import { Keep } from './models';

@Route('synthetic-children')
export class DeferredConditionalArrayController {
  @Get()
  public get<T extends string>(): Keep<{ x: Array<T extends 'a' ? 1 : 2> }> {
    return { x: [] };
  }
}
