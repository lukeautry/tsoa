import { Get, Route, SuccessResponse } from '@namecheap/tsoa-runtime';

enum TEST_ENUM_CODES {
  ACCEPTED = 202,
}

@Route('NoExtends')
export class NoExtendsController {
  @Get('customSuccessResponseCode')
  @SuccessResponse('202')
  public async customSuccessResponseCode(): Promise<void> {
    return Promise.resolve();
  }

  @Get('enumSuccessResponseCode')
  @SuccessResponse(TEST_ENUM_CODES.ACCEPTED)
  public async enumSuccessResponseCode(): Promise<void> {
    return Promise.resolve();
  }

  @Get('rangedSuccessResponse')
  @SuccessResponse('2XX')
  public async rangedSuccessResponse(): Promise<void> {
    return Promise.resolve();
  }
}
