import { Controller, Get, Route, Deprecated } from '@tsoa/runtime';
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
}
