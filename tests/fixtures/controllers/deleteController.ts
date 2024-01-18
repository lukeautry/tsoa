import { Query } from '@tsoa/runtime/decorators/parameter';
import { Delete } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';

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
    @Query() booleanParam: boolean,
    @Query() stringParam: string,
    @Query() numberParam: number,
  ): Promise<void> {
    return;
  }
}
