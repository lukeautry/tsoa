import { Query, Inject } from '@tsoa/runtime/decorators/parameter';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';

import { TestModel } from '../../fixtures/testModel';
import { ModelService } from '../services/modelService';

@Route('Controller')
export class InjectParameterController extends Controller {
  @Get('injectParameterMethod')
  public async injectParameterMethod(@Query() normalParam: string, @Inject() injectedParam: string): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
