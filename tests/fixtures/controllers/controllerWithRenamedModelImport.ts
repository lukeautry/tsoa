import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';

import { ModelService } from '../services/modelService';
import { TestModel as TestModelRenamed } from '../testModel';

@Route('RenamedModelImport')
export class RenamedModelImportsController extends Controller {
  @Get()
  public async get(): Promise<TestModelRenamed> {
    return Promise.resolve(new ModelService().getModel());
  }
}
