import { Get, Route, Extension } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('BadExtensionTest')
export class InvalidExtensionController {
  // Vendor extensions must start with 'x-'
  @Extension('badPropertyName', 'some value')
  @Get('badExtension')
  public async badExtensionMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
