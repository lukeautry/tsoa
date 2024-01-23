import { Get } from '@tsoa/runtime/decorators/methods';
import { Route, Hidden } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';
import { Response } from '@tsoa/runtime/decorators/response';


interface ToHideModel {
  something: string;
}

@Hidden()
@Response<ToHideModel>(200, 'Ok')
@Route('CommonResponseHiddenModelController')
export class CommonResponseHiddenModelController extends Controller {
  @Get('Response1')
  public async handler(): Promise<void> {
    return;
  }

  @Get('Response2')
  public async handler2(): Promise<void> {
    return;
  }
}
