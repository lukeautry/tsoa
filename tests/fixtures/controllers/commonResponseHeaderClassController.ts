import { Controller, Get, Route, Response } from '@tsoa/runtime';

/**
 * Common response header's description
 */
class CommonResponseHeader {
  /**
   * a common link string
   */
  CommonLink: string;

  /**
   * b common link str[]
   */
  CommonLinkB: string[];

  /**
   * c common link string, optional
   */
  CommonLinkC?: string;
}

@Route('CommonResponseHeaderClass')
@Response<null, CommonResponseHeader>(200, 'Ok')
export class CommonResponseHeaderClassController extends Controller {
  @Get('Response1')
  public async handler(): Promise<void> {
    return;
  }

  @Get('Response2')
  public async handler2(): Promise<void> {
    return;
  }
}
