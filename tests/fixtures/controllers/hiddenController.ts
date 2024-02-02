import { Get, Post } from '@tsoa/runtime/decorators/methods';
import { Hidden, Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';

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
