import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Extension } from '@tsoa/runtime/decorators/extension';

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
