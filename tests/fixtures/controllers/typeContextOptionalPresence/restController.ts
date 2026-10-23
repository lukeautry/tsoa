import { Get, Route } from '@tsoa/runtime';
import { TupleValue } from './captureModels';

@Route('optional-capture/rest')
export class RestController {
  @Get()
  public get() {
    const result: TupleValue<[string, ...number[]]> = {};
    return result;
  }
}
