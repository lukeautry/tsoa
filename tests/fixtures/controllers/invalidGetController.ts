import { Route } from '../../../src/decorators/route';
import { Query } from '../../../src/decorators/parameter';
import { Get } from '../../../src/decorators/methods';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('GetTest')
export class InvalidGetTestController {
  @Get('Complex')
  public async getModelWithComplex(@Query() myModel: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
