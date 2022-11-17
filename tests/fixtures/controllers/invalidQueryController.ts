import { Get, Queries, Query, Route } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('QueryTest')
export class InvalidQueryTestController {
  @Get('QueryAndQueries')
  public async getQueryAndQueries(@Queries() _myModel: TestModel, @Query() _stringValue: string): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
