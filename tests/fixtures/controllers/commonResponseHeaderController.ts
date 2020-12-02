import { Controller, Get, Route, Response } from '@tsoa/runtime';

/**
 * Common, asdasdsda
 */
class CommonResponseHeader {
  /**
   * a common link string
   */
  CommonLink: string;

  /**
   * b common link str
   */
  CommonLinkB: string;
}

@Route('CommonResponseHeader')
@Response<null, CommonResponseHeader>(200, 'Ok')
export class ResponseHeaderController extends Controller {
  @Get('Response1')
  public async handler(): Promise<void> {
    return;
  }

  @Get('Response2')
  public async handler2(): Promise<void> {
    return;
  }
}
