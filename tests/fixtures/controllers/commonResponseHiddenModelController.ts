import { Controller, Get, Route, Response, Hidden } from '@tsoa/runtime';

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
