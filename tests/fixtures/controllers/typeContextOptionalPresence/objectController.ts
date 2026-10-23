import { Get, Route } from '@tsoa/runtime';
import { box } from './captureModels';

@Route('optional-capture/object')
export class ObjectController {
  @Get()
  public get() {
    return box({ left: 'one', count: 1 });
  }
}
