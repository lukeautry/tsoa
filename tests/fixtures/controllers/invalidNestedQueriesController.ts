import { Controller, Get, Route, Queries } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';

@Route('Controller')
export class InvalidNestedQueriesController extends Controller {
  @Get('nestedQueriesMethod')
  public nestedQueriesMethod(@Queries() nestedQueries: QueriesObject) {
    return new ModelService().getModel();
  }
}

export interface QueriesObject {
  name: string;
  nestedObject: NestedQueriesObject;
}

export interface NestedQueriesObject {
  nestedName: string;
}
