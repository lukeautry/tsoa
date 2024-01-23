import { Controller, Get, Query, Inject, Route } from '@tsoa/runtime';
import { TestModel } from '../../fixtures/testModel';
import { ModelService } from '../services/modelService';

@Route('Controller')
export class InjectParameterController extends Controller {
  @Get('injectParameterMethod')
  public async injectParameterMethod(@Query() normalParam: string, @Inject() injectedParam: string): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
