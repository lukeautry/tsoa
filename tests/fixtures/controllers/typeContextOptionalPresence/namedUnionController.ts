import { Get, Route } from '@tsoa/runtime';
import { OptionalConditional, Left, Right } from './captureModels';

@Route('optional-capture/namedUnion')
export class NamedUnionController {
  @Get()
  public get() {
    const result: OptionalConditional<Left | Right> = {};
    return result;
  }
}
