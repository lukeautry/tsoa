import { Get, Route } from '@tsoa/runtime';
import { Keep } from './models';

@Route('synthetic-children')
export class DeferredConditionalUnionController {
  @Get()
  public get<T extends string>(): Keep<{ x: { y: (T extends 'a' ? 1 : 2) | string } }> {
    return { x: { y: '' } };
  }
}
