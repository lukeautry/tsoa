import { Get, Route } from '@tsoa/runtime';

export interface User {
  id: string;
}
export interface Admin {
  role: string;
}
export interface Order {
  total: number;
}

export interface Result<T> {
  value: T;
}
export type Either<L, R> = Result<L> | Result<R>;
export interface Holder {
  r: Result<number>;
}

// Invalid TypeScript (TS2312: not statically known); kept to pin order-independent output.
export type Patch<T> = { [K in keyof T]?: T[K] };
// @ts-expect-error TS2312, intentionally
export interface Envelope<T> extends Patch<T> {
  meta: string;
}

export type Based<T> = { value: T };
export interface Wrapped<T> extends Based<T> {
  meta: string;
}

export type Maybe<T> = T | null;
export interface Box<T> {
  opt?: Maybe<T>;
}

export type Pair = [User, Admin];

@Route('review')
export class ReviewController {
  @Get('holder')
  public async holder(): Promise<Holder> {
    return null as any;
  }

  @Get('either')
  public async either(): Promise<Either<string, number>> {
    return null as any;
  }

  @Get('envelope')
  public async envelope(): Promise<Envelope<User>> {
    return null as any;
  }

  @Get('patch')
  public async patch(): Promise<Patch<User>> {
    return null as any;
  }

  @Get('wrapped')
  public async wrapped(): Promise<Wrapped<User>> {
    return null as any;
  }

  @Get('box')
  public async box(): Promise<Box<User>> {
    return null as any;
  }

  @Get('spread')
  public async spread(): Promise<[...Pair, Order]> {
    return null as any;
  }
}
