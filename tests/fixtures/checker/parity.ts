import { Get, Route } from '@tsoa/runtime';

export interface First {
  first: string;
}
export interface Second {
  second: string;
}
export type OneOrTwo = First | Second;

export enum Letters {
  A,
  B,
}
export enum Numbers {
  C = 5,
}
export type AnyEnum = Letters | Numbers;

export interface Target {
  t: string;
}
export type TargetAlias = Target;
export interface Indexed {
  alias: TargetAlias;
}

export interface Cfg {
  a: 'x';
  b: 'y';
}

export type Identity<T> = T;
export type Forward<T, U> = Identity<U> | T;

export type Base = { v: string };
export interface Inheriting extends Base, Partial<Pick<Target, 't'>> {}

@Route('parity')
export class ParityController {
  @Get('exclude')
  public async exclude(): Promise<Exclude<OneOrTwo, First>> {
    return null as any;
  }

  @Get('excludeEnum')
  public async excludeEnum(): Promise<Exclude<AnyEnum, Numbers>> {
    return null as any;
  }

  @Get('indexed')
  public async indexed(): Promise<Indexed['alias']> {
    return null as any;
  }

  @Get('values')
  public async values(): Promise<{ v: Cfg[keyof Cfg] }> {
    return null as any;
  }

  @Get('forward')
  public async forward(): Promise<Forward<boolean, Target>> {
    return null as any;
  }

  @Get('distributed')
  public async distributed(): Promise<Partial<({ a: string } | { b: string }) & { c: string }>> {
    return null as any;
  }

  @Get('inheriting')
  public async inheriting(): Promise<Inheriting> {
    return null as any;
  }
}

export type NullAlias = null;
export type IndirectNull = NullAlias;
export interface NullUnionBody {
  a: boolean | NullAlias;
  b: boolean | IndirectNull;
}

export type ValueOf = Cfg[keyof Cfg];

export type Pair = First & Second;
export type Triple = Pair & Target;
export type Distributed = OneOrTwo & Target;

export interface Leaf {
  leaves: Leaf[];
}
export type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

@Route('parity2')
export class Parity2Controller {
  @Get('nullUnion')
  public async nullUnion(): Promise<NullUnionBody> {
    return null as any;
  }

  @Get('valueOf')
  public async valueOf(): Promise<ValueOf> {
    return null as any;
  }

  @Get('triple')
  public async triple(): Promise<Triple> {
    return null as any;
  }

  @Get('distributed')
  public async distributed(): Promise<Distributed> {
    return null as any;
  }

  @Get('deep')
  public async deep(): Promise<DeepPartial<Leaf>> {
    return null as any;
  }
}

export interface Formats {
  /** @isInt */
  n: number;
}
export interface UsesFormats {
  only: Formats['n'];
  element: Array<{ p: 'lit' | null }>[number];
}

@Route('parity3')
export class Parity3Controller {
  @Get('formats')
  public async formats(): Promise<UsesFormats> {
    return null as any;
  }
}

export interface Wrapper<T> {
  value: T;
}
export interface GenericOwner<T = string> {
  nested?: Wrapper<T>;
  either?: T | number;
  plain?: string;
}

@Route('parity4')
export class Parity4Controller {
  @Get('owner')
  public async owner(): Promise<GenericOwner> {
    return null as any;
  }

  @Get('optionalUnion')
  public async optionalUnion(): Promise<{ v?: 'a' | 'b' }> {
    return null as any;
  }
}

export class Defaults {
  public annotated?: boolean;
  public inferred? = true;
}

@Route('parity5')
export class Parity5Controller {
  @Get('defaults')
  public async defaults(): Promise<Defaults> {
    return null as any;
  }
}
