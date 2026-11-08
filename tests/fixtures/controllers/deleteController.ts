import { Delete, QueryParam, Route } from '@tsoa/runtime';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('DeleteTest')
export class DeleteTestController {
  @Delete()
  public async deleteWithReturnValue(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Delete('Current')
  public async deleteCurrent(): Promise<void> {
    return;
  }

  @Delete('{numberPathParam}/{booleanPathParam}/{stringPathParam}')
  public async getModelByParams(
    numberPathParam: number,
    stringPathParam: string,
    booleanPathParam: boolean,
    @QueryParam() booleanParam: boolean,
    @QueryParam() stringParam: string,
    @QueryParam() numberParam: number,
  ): Promise<void> {
    return;
  }
}
