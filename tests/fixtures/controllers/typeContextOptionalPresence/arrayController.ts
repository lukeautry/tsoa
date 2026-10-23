import { Get, Route } from '@tsoa/runtime';
import { box } from './captureModels';

@Route('optional-capture/array')
export class ArrayController {
  @Get()
  public get() {
    return box(['one', 'two']);
  }
}
