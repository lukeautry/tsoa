import { Get, Route } from '@tsoa/runtime';
import { TupleValue } from './captureModels';

@Route('optional-capture/fixed')
export class FixedController {
  @Get()
  public get() {
    const result: TupleValue<readonly [string, number]> = {};
    return result;
  }
}
