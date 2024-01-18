import { Query } from '@tsoa/runtime/decorators/parameter';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Hidden, Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';

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
