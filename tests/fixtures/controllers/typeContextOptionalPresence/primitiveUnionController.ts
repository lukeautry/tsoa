import { Get, Route } from '@tsoa/runtime';
import { OptionalConditional } from './captureModels';

@Route('optional-capture/primitiveUnion')
export class PrimitiveUnionController {
  @Get()
  public get() {
    const result: OptionalConditional<string | number> = {};
    return result;
  }
}
