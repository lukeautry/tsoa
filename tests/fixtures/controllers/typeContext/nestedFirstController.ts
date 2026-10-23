import { Get, Route } from '@tsoa/runtime';
import { DeepPartial, Left, Nested, Right, Shade } from './arrayModels';

interface Target {
  nested: Nested;
  list: Nested[];
  joint: Left & Right;
  flag: true | false;
  color: Shade.Red | Shade.Blue;
}

@Route('type-context')
export class NestedFirstController {
  @Get()
  public get(): DeepPartial<Target> {
    return {};
  }
}
