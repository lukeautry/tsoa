import { Controller, Get, Hidden, Post, Route } from '@namecheap/tsoa-runtime';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('Controller')
@Hidden()
export class HiddenMethodController extends Controller {
  @Get('hiddenGetMethod')
  public async hiddenGetMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
  @Post('hiddenPostMethod')
  public async hiddenPostMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
