import { Get, Route, CustomAttribute } from '../../../src';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('CustomAttributeTest')
export class InvalidCustomAttributeController {
  // Vendor extensions must start with 'x-'
  @CustomAttribute('badPropertyName', 'some value')
  @Get('badCustomAttribute')
  public async badCustomAttributeMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
