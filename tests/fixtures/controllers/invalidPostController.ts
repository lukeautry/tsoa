import { Route } from '../../../src/decorators/route';
import { Body } from '../../../src/decorators/parameter';
import { Post } from '../../../src/decorators/methods';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('PostTest')
export class InvalidPostTestController {

  @Post('WithMultipleBody')
  public async postWithMultipleBodyParams(
      @Body() firstParam: TestModel,
      @Body()secondParam: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
