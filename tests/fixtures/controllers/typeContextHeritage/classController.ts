import { Get, Route } from '@tsoa/runtime';
import { DerivedClass } from './models';

@Route('type-context-heritage')
export class ClassController {
  @Get()
  public get(): DerivedClass {
    return new DerivedClass();
  }
}
