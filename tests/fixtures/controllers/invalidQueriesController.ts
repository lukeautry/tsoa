import { Get, Queries, Query, Route } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('QueriesTest')
export class InvalidQueriesTestController {
  @Get('WithMultipleQueries')
  public async getWithMultipleQueriesParams(@Queries() _firstParam: TestModel, @Queries() _secondParam: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
