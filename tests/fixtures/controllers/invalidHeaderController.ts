import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { TsoaResponse } from '@tsoa/runtime/interfaces/response';
import { Res } from '@tsoa/runtime/decorators/response';

@Route('/')
export class InvalidHeaderTestController {
  @Get('/path')
  public async getWithInvalidHeader(@Res() notFound: TsoaResponse<404, void, 'Header names must be of type string'>): Promise<void> {
    return;
  }
}
