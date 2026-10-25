import { Get, Route } from '@tsoa/runtime';
import { Keep, Optional } from './models';

interface TupleLeaf {
  tupleValue: string;
}
interface NamedLeaf {
  namedValue: string;
}
interface RestLeaf {
  restValue: string;
}
interface RestArrayLeaf {
  restArrayValue: string;
}

@Route('synthetic-children')
export class TuplesController {
  @Get('tuple')
  public tuple(): Keep<{ pair: [Optional<TupleLeaf>, string]; direct: Optional<TupleLeaf> }> {
    return { pair: [{}, ''], direct: {} };
  }

  @Get('named-tuple')
  public namedTuple(): Keep<{ named: [first: Optional<NamedLeaf>, second: string]; direct: Optional<NamedLeaf> }> {
    return { named: [{}, ''], direct: {} };
  }

  @Get('tuple-rest')
  // eslint-disable-next-line @typescript-eslint/array-type
  public tupleRest(): Keep<{ rest: [string, ...Optional<RestLeaf>[]]; direct: Optional<RestLeaf> }> {
    return { rest: [''], direct: {} };
  }

  @Get('tuple-rest-arrays')
  // eslint-disable-next-line @typescript-eslint/array-type
  public tupleRestArrays(): Keep<{ rest: [string, ...Optional<RestArrayLeaf>[][]]; direct: Optional<RestArrayLeaf> }> {
    return { rest: ['', [{}]], direct: {} };
  }
}
