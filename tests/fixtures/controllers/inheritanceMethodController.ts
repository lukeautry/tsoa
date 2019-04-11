import {
  Get,
  Patch,
  Put,
  Route,
} from '../../../src';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';
import { BaseController } from './baseController';

@Route('InheritedMethodTest')
export class InheritanceMethodController extends BaseController {
  @Get('Get')
  public async getMethod(): Promise<TestModel> {
      return new ModelService().getModel();
  }

  @Patch('Patch')
  public async patchMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Put('OverwrittenMethod')
  public async putMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
