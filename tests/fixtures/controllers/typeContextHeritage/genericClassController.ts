import { Get, Route } from '@tsoa/runtime';
import { GenericClass, Left } from './models';

@Route('type-context-heritage')
export class GenericClassController {
  @Get()
  public get(): GenericClass<Left> {
    return new GenericClass<Left>();
  }
}
