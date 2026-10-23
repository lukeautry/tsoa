import { Get, Route } from '@tsoa/runtime';
import { Generic, Left } from './models';

@Route('type-context-heritage')
export class GenericController {
  @Get()
  public get(): Generic<Left> {
    return { extra: 'extra' };
  }
}
