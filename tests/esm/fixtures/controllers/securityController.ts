import { Controller, Get, Route, Security } from '@tsoa/runtime';

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
