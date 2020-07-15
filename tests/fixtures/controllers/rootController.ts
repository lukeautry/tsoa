import { Controller, Get, Route } from '@tsoa/runtime';
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
