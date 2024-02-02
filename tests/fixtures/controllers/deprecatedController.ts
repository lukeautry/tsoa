import { Deprecated } from '@tsoa/runtime/decorators/deprecated';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';

import { TestModel } from '../../fixtures/testModel';
import { ModelService } from '../services/modelService';

@Route('Controller')
export class DeprecatedController extends Controller {
  @Get('normalGetMethod')
  public async normalGetMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }

  @Get('deprecatedGetMethod')
  @Deprecated()
  public async deprecatedGetMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }

  /** @deprecated */
  @Get('deprecatedGetMethod2')
  public async deprecatedGetMethod2(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
