import { Get, QueryParam, Route } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('GetTest')
export class InvalidGetTestController {
  @Get('Complex')
  public async getModelWithComplex(@QueryParam() myModel: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
