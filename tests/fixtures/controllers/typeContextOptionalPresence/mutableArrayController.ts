import { Get, Route } from '@tsoa/runtime';
import { ArrayMutability } from './captureModels';

@Route('optional-capture/mutableArray')
export class MutableArrayController {
  @Get()
  public get() {
    const result: ArrayMutability<string[]> = {};
    return result;
  }
}
