import { Get } from '../../../src/decorators/methods';
import { ModelService } from '../services/modelService';
import { Route } from '../../../src/decorators/route';
import { TestModel } from '../testModel';

@Route()
export class PathlessGetTestController {
  @Get('Current')
  public async getCurrentModel(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
