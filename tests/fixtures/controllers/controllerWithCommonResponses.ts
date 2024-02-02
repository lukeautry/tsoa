import { Get, Post } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';
import { Response } from '@tsoa/runtime/decorators/response';

import { ModelService } from '../services/modelService';
import { ErrorResponseModel, TestModel } from '../testModel';

@Route('Controller')
@Response<ErrorResponseModel>('401', 'Unauthorized')
export class HiddenMethodController extends Controller {
  @Get('protectedGetMethod')
  public async protectedGetMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
  @Post('protectedPostMethod')
  public async protectedPostMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
