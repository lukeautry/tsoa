import { Get, Route } from '../../../src';
import { ModelService } from '../services/modelService';

@Route('GetTest')
export class DuplicateMethodsTestController {
  @Get('Complex')
  public async getModel() {
    return new ModelService().getModel();
  }

  @Get('Complex')
  public async duplicateGetModel() {
    return new ModelService().getModel();
  }
}
