import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';

import { ForeignIndexedValue } from '../testModel';

@Route('UnsupportedIndexedType')
export class UnsupportedIndexedTypeController {
  @Get('Value')
  public async getValue(): Promise<ForeignIndexedValue> {
    return 'FOO';
  }
}
