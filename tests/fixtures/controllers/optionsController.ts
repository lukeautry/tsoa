import { Controller, Options, Route } from '@tsoa/runtime';

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
