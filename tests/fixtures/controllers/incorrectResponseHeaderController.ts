import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';
import { Response } from '@tsoa/runtime/decorators/response';


@Route('IncorrectResponseHeader')
@Response<null, any>(200)
export class IncorrectResponseHeaderController extends Controller {
  @Get()
  public async handler(): Promise<void> {
    return;
  }
}
