import { Controller, Get, Hidden, Route, Query } from '@namecheap/tsoa-runtime';
import { TestModel } from '../../fixtures/testModel';
import { ModelService } from '../services/modelService';

@Route('Controller')
export class HiddenMethodController extends Controller {
  @Get('normalGetMethod')
  public async normalGetMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }

  @Get('hiddenGetMethod')
  @Hidden()
  public async hiddenGetMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }

  @Get('hiddenQueryMethod')
  public async hiddenQueryMethod(@Query() normalParam: string, @Query() @Hidden() defaultSecret = true, @Query() @Hidden() optionalSecret?: string): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
