import { Get, Route } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route()
export class PathlessGetTestController {
  @Get('Current')
  public async getCurrentModel(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
