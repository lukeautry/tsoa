import {
  Route, Patch, Body, TsoaResponse
} from '../../../src';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('PatchTest')
export class PatchTestController {
  @Patch()
  public async patchModel( @Body() model: TestModel): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }

  @Patch('Location')
  public async patchModelAtLocation(): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }

  @Patch('Multi')
  public async patchWithMultiReturn(): Promise<TsoaResponse<TestModel[]>> {
    return {
      body: [
        new ModelService().getModel()
      ]
    };
  }

  @Patch('WithId/{id}')
  public async patchWithId(id: number): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }
}
