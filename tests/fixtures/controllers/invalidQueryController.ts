import { Get, QueryParams, QueryParam, Route } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('QueryTest')
export class InvalidQueryTestController {
  @Get('QueryAndQueries')
  public async getQueryAndQueries(@QueryParams() _queriesObject: QueriesObject, @QueryParam() _stringValue: string): Promise<TestModel> {
    return new ModelService().getModel();
  }
}

interface QueriesObject {
  name: string;
}
