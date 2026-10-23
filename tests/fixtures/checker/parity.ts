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
