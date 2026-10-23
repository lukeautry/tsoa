import { Get, Route } from '@tsoa/runtime';
import { ArrayMutability } from './captureModels';

@Route('optional-capture/readonlyArray')
export class ReadonlyArrayController {
  @Get()
  public get() {
    const result: ArrayMutability<readonly string[]> = {};
    return result;
  }
}
