import { Get, Route } from '@tsoa/runtime';
import { DeepPartial, Left, Nested, Right, Shade } from './arrayModels';

interface Target {
  list: Nested[];
  nested: Nested;
  joint: Left & Right;
  flag: true | false;
  color: Shade.Red | Shade.Blue;
}

@Route('type-context')
export class ArrayFirstController {
  @Get()
  public get(): DeepPartial<Target> {
    return {};
  }
}
