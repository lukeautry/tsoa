import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';

import { TestModel } from '../../fixtures/testModel';
import { ModelService } from '../services/modelService';

@Route()
export class RootController extends Controller {
  @Get()
  public async rootHandler(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }

  @Get('rootControllerMethodWithPath')
  public async rootControllerMethodWithPath(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
