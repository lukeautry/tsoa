import { Controller, Get, Route } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { TestModel as TestModelRenamed } from '../testModel';

@Route('RenamedModelImport')
export class RenamedModelImportsController extends Controller {
  @Get()
  public async get(): Promise<TestModelRenamed> {
    return Promise.resolve(new ModelService().getModel());
  }
}
