import {
  Route, Delete, Query, TsoaResponse
} from '../../../src';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('DeleteTest')
export class DeleteTestController {
  @Delete()
  public async deleteWithReturnValue(): Promise<TsoaResponse<TestModel>> {
    return {
      body: new ModelService().getModel(),
    };
  }

  @Delete('Current')
  public async deleteCurrent(): Promise<TsoaResponse<void>> {
    return {};
  }

  @Delete('{numberPathParam}/{booleanPathParam}/{stringPathParam}')
  public async getModelByParams(
    numberPathParam: number,
    stringPathParam: string,
    booleanPathParam: boolean,
    @Query() booleanParam: boolean,
    @Query() stringParam: string,
    @Query() numberParam: number): Promise<TsoaResponse<void>> {
    return {};
  }
}
