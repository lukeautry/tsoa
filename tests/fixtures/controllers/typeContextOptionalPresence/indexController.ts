import { Get, Route } from '@tsoa/runtime';
import { box } from './captureModels';

@Route('optional-capture/index')
export class IndexController {
  @Get()
  public get() {
    const value: { [key: string]: { valid: boolean } } = {};
    return box(value);
  }
}
