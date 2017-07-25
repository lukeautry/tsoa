import {
  Get, Route, TsoaResponse
} from '../../../src';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route()
export class PathlessGetTestController {
  @Get('Current')
  public async getCurrentModel(): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }
}
