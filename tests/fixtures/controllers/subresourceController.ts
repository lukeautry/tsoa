import { Get, Path, Route } from '@tsoa/runtime';

@Route('SubResourceTest/{mainResourceId}/SubResource')
export class SubResourceTestController {
  @Get()
  public async getSubResource(@Path('mainResourceId') mainResourceId: string): Promise<string> {
    return mainResourceId;
  }

  @Get('{subResourceId}')
  public async getWithParameter(@Path('mainResourceId') mainResourceId: string, @Path('subResourceId') subResourceId: string): Promise<string> {
    return `${mainResourceId}:${subResourceId}`;
  }
}
  }

  @Get('{subResourceId}')
  public async getWithParameter(@Path('mainResourceId') mainResourceId: string, @Path('subResourceId') subResourceId: string): Promise<TestModel> {
    const model = new ModelService().getModel();
    model.stringArray = [mainResourceId, subResourceId];
    return model;
  }
}
