import { Route, Controller, Post, Body } from '@tsoa/runtime';

@Route('ExampleTest')
export class InvalidExampleController extends Controller {
  /**
   * @example body {
   *  "this": is,
   *  a: wrong-format,
   * }
   */
  @Post('WrongJSON-Format')
  public async WrongJSONFormat(@Body() body: { name: string; index: number }): Promise<void> {
    return;
  }
}
