import { Controller } from '@tsoa/runtime/interfaces/controller';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Security } from '@tsoa/runtime/decorators/security';

import type { TestModel } from '../testModel.js';

@Security('tsoa_auth')
@Route('SecurityTest')
export class SecurityController extends Controller {
  @Get()
  public async getHandler(): Promise<TestModel> {
    return {
      str: 'str',
    };
  }
}
