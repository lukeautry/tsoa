import { Query } from '@tsoa/runtime/decorators/parameter';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';

import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('GetTest')
export class InvalidGetTestController {
  @Get('Complex')
  public async getModelWithComplex(@Query() myModel: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
