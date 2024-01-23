import { Controller, Get, Route, Response } from '@tsoa/runtime';

@Route('CommonResponseHeaderObject')
@Response<
  null,
  {
    objectA: string;
    objectB: string[];
    objectC?: string;
  }
>(200, 'Ok')
export class CommonResponseHeaderObjectController extends Controller {
  @Get('Response1')
  public async handler(): Promise<void> {
    return;
  }

  @Get('Response2')
  public async handler2(): Promise<void> {
    return;
  }
}
