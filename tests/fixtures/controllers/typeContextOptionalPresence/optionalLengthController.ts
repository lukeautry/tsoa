import { Get, Route } from '@tsoa/runtime';
import { TupleLength } from './captureModels';

@Route('optional-capture/optionalLength')
export class OptionalLengthController {
  @Get()
  public get() {
    const result: TupleLength<[string, number?]> = {};
    return result;
  }
}
