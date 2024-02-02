import { Queries } from '@tsoa/runtime/decorators/parameter';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';

import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('QueriesTest')
export class InvalidQueriesTestController {
  @Get('WithMultipleQueries')
  public async getWithMultipleQueriesParams(@Queries() _firstParam: QueriesObject, @Queries() _secondParam: QueriesObject): Promise<TestModel> {
    return new ModelService().getModel();
  }
}

interface QueriesObject {
  name: string;
}
