import { Route } from '../../../src/decorators/route';
import { Delete } from '../../../src/decorators/methods';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

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
    booleanParam: boolean,
    stringParam: string,
    numberParam: number): Promise<void> {
    return;
  }
}
