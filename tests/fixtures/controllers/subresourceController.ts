import { Path } from '@tsoa/runtime/decorators/parameter';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';


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

@Route('SubResourceColonTest/:mainResourceId/SubResource')
export class SubResourceColonTestController {
  @Get()
  public async getSubResource(@Path('mainResourceId') mainResourceId: string): Promise<string> {
    return mainResourceId;
  }

  @Get('{subResourceId}')
  public async getWithParameter(@Path('mainResourceId') mainResourceId: string, @Path('subResourceId') subResourceId: string): Promise<string> {
    return `${mainResourceId}:${subResourceId}`;
  }
}
