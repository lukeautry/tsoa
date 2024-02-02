import { Queries } from '@tsoa/runtime/decorators/parameter';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';

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
