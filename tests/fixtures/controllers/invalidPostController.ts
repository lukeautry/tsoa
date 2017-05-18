import {
  Route, Body, Post
} from '../../../src';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('PostTest')
export class InvalidPostTestController {

  @Post('WithMultipleBody')
  public async postWithMultipleBodyParams(
    @Body() firstParam: TestModel,
    @Body() secondParam: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
