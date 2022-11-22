import { Controller, Get as RequestGet, Route } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('RenamedMethodImport')
export class RenamedMethodImportController extends Controller {

  @RequestGet()
  public async get(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
