import { Get, Path, Route } from '@tsoa/runtime';

import { TestModel } from '../testModel';
import { ModelService } from './../services/modelService';

@Route('SubResourceTest/{mainResourceId}/SubResource')
export class SubResourceTestController {
  @Get()
  public async getSubResource(@Path('mainResourceId') mainResourceId: string): Promise<TestModel> {
    const model = new ModelService().getModel();
    model.stringArray = [mainResourceId];
    return model;
  }

  @Get('{subResourceId}')
  public async getWithParameter(@Path('mainResourceId') mainResourceId: string, @Path('subResourceId') subResourceId: string): Promise<TestModel> {
    const model = new ModelService().getModel();
    model.stringArray = [mainResourceId, subResourceId];
    return model;
  }
}
