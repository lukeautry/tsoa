import {
  Route, Query, Get
} from '../../../src';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('GetTest')
export class InvalidGetTestController {
  @Get('Complex')
  public async getModelWithComplex( @Query() myModel: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
