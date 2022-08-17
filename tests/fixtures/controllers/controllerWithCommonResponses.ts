import { Controller, Get, Response, Post, Route } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { ErrorResponseModel, TestModel as ResponseModel } from '../testModel';

@Route('Controller')
@Response<ErrorResponseModel>('401', 'Unauthorized')
export class HiddenMethodController extends Controller {
  @Get('protectedGetMethod')
  public async protectedGetMethod(): Promise<ResponseModel> {
    return Promise.resolve(new ModelService().getModel());
  }
  @Post('protectedPostMethod')
  public async protectedPostMethod(): Promise<ResponseModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
