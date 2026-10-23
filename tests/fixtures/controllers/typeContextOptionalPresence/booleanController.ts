import { Get, Route } from '@tsoa/runtime';
import { OptionalTemplate } from './captureModels';

@Route('optional-capture/boolean')
export class BooleanController {
  @Get()
  public get() {
    const result: OptionalTemplate<boolean> = {};
    return result;
  }
}
