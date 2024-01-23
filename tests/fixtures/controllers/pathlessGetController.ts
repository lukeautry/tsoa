import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';

import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route()
export class PathlessGetTestController {
  @Get('Current')
  public async getCurrentModel(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
