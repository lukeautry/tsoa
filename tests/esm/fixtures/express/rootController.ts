import { Controller } from '@tsoa/runtime/interfaces/controller';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';

import type { TestModel } from '../testModel.js';

@Route()
export class RootController extends Controller {
  @Get()
  public async rootHandler(): Promise<TestModel> {
    return {
      str: 'str',
    };
  }
}
