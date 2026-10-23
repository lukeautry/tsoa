import { Get, Route } from '@tsoa/runtime';
import { OptionalTemplate } from './captureModels';

@Route('optional-capture/literalUnion')
export class LiteralUnionController {
  @Get()
  public get() {
    const result: OptionalTemplate<'a' | 'b'> = {};
    return result;
  }
}
