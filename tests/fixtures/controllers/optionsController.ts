import { Options } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';

@Route('OptionsTest')
export class OptionsTestController extends Controller {
  @Options()
  public async methodExists(): Promise<void> {
    return;
  }

  @Options('Current')
  public async methodExistsCurrent(): Promise<void> {
    return;
  }
}
