import { Body } from '@tsoa/runtime/decorators/parameter';
import { Post } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';


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
