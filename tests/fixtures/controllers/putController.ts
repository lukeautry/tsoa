import {
  Route, Body, Put, TsoaResponse
} from '../../../src';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('PutTest')
export class PutTestController {
  @Put()
  public async putModel( @Body() model: TestModel): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }

  @Put('Location')
  public async putModelAtLocation(): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }

  @Put('Multi')
  public async putWithMultiReturn(): Promise<TsoaResponse<TestModel[]>> {
    const model = new ModelService().getModel();
    return {body: [model]};
  }

  @Put('WithId/{id}')
  public async putWithId(id: number): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }
}
