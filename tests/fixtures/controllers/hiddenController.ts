import { Controller, Get, Hidden, Route } from '../../../src';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('Controller')
@Hidden()
export class HiddenMethodController extends Controller {
  @Get('hiddenGetMethod')
  public async hiddenGetMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
