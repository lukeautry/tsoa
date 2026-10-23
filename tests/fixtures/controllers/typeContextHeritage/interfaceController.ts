import { Get, Route } from '@tsoa/runtime';
import { Derived } from './models';

@Route('type-context-heritage')
export class InterfaceController {
  @Get()
  public get(): Derived {
    return { extra: 'extra' };
  }
}
