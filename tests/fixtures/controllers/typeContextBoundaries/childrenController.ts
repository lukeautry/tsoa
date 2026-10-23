import { Get, Route } from '@tsoa/runtime';
import { Keep, Optional } from './models';

interface LiteralLeaf {
  literalValue: string;
}

interface IndexLeaf {
  indexValue: number;
}

interface AccessLeaf {
  accessValue: boolean;
}

interface KeywordLeaf {
  keywordValue: string;
}

interface KeyofLeaf {
  keyofValue: number;
}

interface MappedIndexLeaf {
  mappedIndexValue: boolean;
}

type Lookup<T> = { [key: string]: Optional<T> };
type Value<T> = { child: Optional<T> }['child'];
type MappedLookup<T> = { [key in string]: Optional<T> };

interface KeyofOwner {
  child: Optional<KeyofLeaf>;
}

interface Target {
  literal: { child: Optional<LiteralLeaf> };
  index: Lookup<IndexLeaf>;
  access: Value<AccessLeaf>;
}

@Route('type-context-boundaries')
export class ChildrenController {
  @Get()
  public get(): Keep<Target> {
    return { literal: { child: {} }, index: {}, access: {} };
  }

  @Get('keyword')
  public keyword(): Lookup<KeywordLeaf>[string] {
    return {};
  }

  @Get('keyof')
  public keyofValue(): KeyofOwner[keyof KeyofOwner] {
    return {};
  }

  @Get('mapped-index')
  public mappedIndex(): MappedLookup<MappedIndexLeaf> {
    return {};
  }
}
