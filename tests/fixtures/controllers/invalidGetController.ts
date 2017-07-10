import {
  Route, Query, Get, TsoaResponse
} from '../../../src';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('GetTest')
export class InvalidGetTestController {
  @Get('Complex')
  public async getModelWithComplex( @Query() myModel: TestModel): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }
}
