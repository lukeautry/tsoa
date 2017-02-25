import { Route } from '../../../src/decorators/route';
import { Patch } from '../../../src/decorators/methods';
import { Body } from '../../../src/decorators/parameter';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('PatchTest')
export class PatchTestController {
  @Patch()
  public async patchModel(@Body() model: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Patch('Location')
  public async patchModelAtLocation(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Patch('Multi')
  public async patchWithMultiReturn(): Promise<TestModel[]> {
    return [
      new ModelService().getModel()
    ];
  }

  @Patch('WithId/{id}')
  public async patchWithId(id: number): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
