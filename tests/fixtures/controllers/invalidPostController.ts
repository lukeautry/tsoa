import { Body } from '@tsoa/runtime/decorators/parameter';
import { Post } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';

import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('PostTest')
export class InvalidPostTestController {
  @Post('WithMultipleBody')
  public async postWithMultipleBodyParams(@Body() firstParam: TestModel, @Body() secondParam: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
