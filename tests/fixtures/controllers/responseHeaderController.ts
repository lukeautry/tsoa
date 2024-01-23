import { Controller, Get, Route, SuccessResponse, Response, TsoaResponse, Res } from '@tsoa/runtime';

/**
 * response header's description
 */
interface ResponseHeader {
  /**
   * a link string
   */
  Link: string;

  /**
   * b link str[]
   */
  LinkB: string[];

  /**
   * c link string, optional
   */
  LinkC?: string;
}

@Route('ResponseHeader')
export class ResponseHeaderController extends Controller {
  @Get('SuccessResponseWithHeaderClass')
  @SuccessResponse<ResponseHeader>(200, 'zzz')
  public async handler(): Promise<void> {
    return;
  }

  @Get('SuccessResponseWithObject')
  @SuccessResponse<{ linkA: string; linkB: string[]; linkOpt?: string }>(200, 'xxx')
  public async handler2(): Promise<void> {
    return;
  }

  @Get('ResponseWithHeaderClass')
  @Response<null, ResponseHeader>(200, 'yyy')
  public async handler3(): Promise<void> {
    return;
  }

  @Get('ResponseWithObject')
  @Response<null, { linkC: string; linkD: string[]; linkOpt?: string }>(200, 'yyy')
  public async handler4(): Promise<void> {
    return;
  }

  @Get('TsoaResponseWithHeaderClass')
  public async handler5(@Res() res: TsoaResponse<200, null, ResponseHeader>): Promise<void> {
    return;
  }

  @Get('TsoaResponseWithObject')
  public async handler6(@Res() res: TsoaResponse<200, null, { linkE: string; linkF: string[]; linkOpt?: string }>): Promise<void> {
    return;
  }
}
