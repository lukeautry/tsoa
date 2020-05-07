import { Get, Query, Route } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('GetTest')
export class InvalidGetTestController {
  @Get('Complex')
  public async getModelWithComplex(@Query() myModel: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
