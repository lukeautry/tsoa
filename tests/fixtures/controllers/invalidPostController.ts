import {
  Route, Body, Post, TsoaResponse
} from '../../../src';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('PostTest')
export class InvalidPostTestController {

  @Post('WithMultipleBody')
  public async postWithMultipleBodyParams(
    @Body() firstParam: TestModel,
    @Body() secondParam: TestModel): Promise<TsoaResponse<TestModel>> {
    return {body: new ModelService().getModel()};
  }
}
