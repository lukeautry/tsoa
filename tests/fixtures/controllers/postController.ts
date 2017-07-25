import {
  Route, Body, Query, Post, Patch, TsoaResponse
} from '../../../src';
import { GenericRequest, TestModel, TestClassModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('PostTest')
export class PostTestController {
  @Post()
  public async postModel( @Body() model: TestModel): Promise<TsoaResponse<TestModel>> {
    return {body: model};
  }

  @Patch()
  public async updateModel( @Body() model: TestModel): Promise<TsoaResponse<TestModel>> {
    const body = await new ModelService().getModel();

    return {body: body};
  }

  @Post('WithClassModel')
  public async postClassModel( @Body() model: TestClassModel): Promise<TsoaResponse<TestClassModel>> {
    const augmentedModel = new TestClassModel('test', 'test2', 'test3');
    augmentedModel.id = 700;

    return {body: augmentedModel};
  }

  @Post('Location')
  public async postModelAtLocation(): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }

  @Post('Multi')
  public async postWithMultiReturn(): Promise<TsoaResponse<TestModel[]>> {
    const model = new ModelService().getModel();

    return {
      body: [
        model,
        model
      ],
    };
  }

  @Post('WithId/{id}')
  public async postWithId(id: number): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }

  @Post('WithBodyAndQueryParams')
  public async postWithBodyAndQueryParams( @Body() model: TestModel, @Query() query: string): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }

  @Post('GenericBody')
  public async getGenericRequest( @Body() genericReq: GenericRequest<TestModel>): Promise<TsoaResponse<TestModel>> {
    return {body: genericReq.value};
  }
}
