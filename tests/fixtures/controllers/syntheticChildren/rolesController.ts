import { Get, Route } from '@tsoa/runtime';
import { Keep, Optional } from './models';

interface ArrayLeaf {
  arrayValue: string;
}
interface ReadonlyLeaf {
  readonlyValue: string;
}
interface ReadonlyGenericLeaf {
  readonlyGenericValue: string;
}
interface MemberLeaf {
  memberValue: string;
}
interface IndexLeaf {
  indexValue: number;
}
interface UnionLeaf {
  unionValue: string;
}
interface IntersectionLeaf {
  intersectionValue: string;
}
interface KeywordLeaf {
  keywordValue: string;
}
interface LiteralLeaf {
  literalValue: boolean;
}
interface KeyofLeaf {
  keyofValue: number;
}

type Lookup<T> = { [key: string]: Optional<T> };
type Table<T> = { [key in 'child']: Optional<T> };

interface Values {
  first: Optional<KeyofLeaf>;
  second: number;
}

@Route('synthetic-children')
export class RolesController {
  @Get('array')
  // eslint-disable-next-line @typescript-eslint/array-type
  public array(): Keep<{ value: Optional<ArrayLeaf>[] }> {
    return { value: [] };
  }

  @Get('readonly-array')
  // eslint-disable-next-line @typescript-eslint/array-type
  public readonlyArray(): Keep<{ value: readonly Optional<ReadonlyLeaf>[] }> {
    return { value: [] };
  }

  @Get('readonly-generic-array')
  public readonlyGenericArray(): Keep<{ value: ReadonlyArray<Optional<ReadonlyGenericLeaf>> }> {
    return { value: [] };
  }

  @Get('member')
  public member(): Keep<{ value: { child: Optional<MemberLeaf> } }> {
    return { value: { child: {} } };
  }

  @Get('index')
  public index(): Keep<{ value: { [key: string]: Optional<IndexLeaf> } }> {
    return { value: {} };
  }

  @Get('union')
  public union(): Keep<{ value: Optional<UnionLeaf> | string }> {
    return { value: '' };
  }

  @Get('intersection')
  public intersection(): Keep<{ value: Optional<IntersectionLeaf> & { marker: boolean } }> {
    return { value: { marker: true } };
  }

  @Get('indexed-keyword')
  public indexedKeyword(): Lookup<KeywordLeaf>[string] {
    return {};
  }

  @Get('indexed-literal')
  public indexedLiteral(): Table<LiteralLeaf>['child'] {
    return {};
  }

  @Get('indexed-keyof')
  public indexedKeyof(): Values[keyof Values] {
    return 0;
  }
}
