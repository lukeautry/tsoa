import { Controller, Get, Response, Post, Route } from '../../../src';
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
