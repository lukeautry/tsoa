import { Get, Route } from '@tsoa/runtime';
import { Left, ObjectGeneric } from './models';

@Route('type-context-heritage')
export class ObjectGenericController {
  @Get()
  public get(): ObjectGeneric<Left> {
    return { extra: 'extra' };
  }
}
