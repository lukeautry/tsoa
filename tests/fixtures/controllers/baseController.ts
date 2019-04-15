import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
} from '../../../src';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

class SuperBaseController extends Controller {
  @Patch('SuperBasePatch')
  public async superBasePatch(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}

export class BaseController extends SuperBaseController{
  @Get('Get')
  public async getMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Post('Post')
  public async postMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('Base')
  public async baseMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Put('OverwrittenMethod')
  public async putMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}