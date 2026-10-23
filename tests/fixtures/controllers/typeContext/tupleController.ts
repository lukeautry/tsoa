import { Get, Route } from '@tsoa/runtime';

type FixedTuple = readonly [string, number];
type RestTuple = readonly [string, ...number[]];

@Route('type-context')
export class TupleController {
  @Get('fixed')
  public fixed(): FixedTuple {
    return ['first', 1];
  }

  @Get('rest')
  public rest(): RestTuple {
    return ['first', 1, 2];
  }
}
