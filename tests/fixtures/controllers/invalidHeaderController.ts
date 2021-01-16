import { Get, Res, Route, TsoaResponse } from '@tsoa/runtime';

@Route('/')
export class InvalidHeaderTestController {
  @Get('/path')
  public async getWithInvalidHeader(@Res() notFound: TsoaResponse<404, void, 'Header values must be string or string[]'>): Promise<void> {
    return;
  }
}
