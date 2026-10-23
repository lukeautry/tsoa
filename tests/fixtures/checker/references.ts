import { Get, Route } from '@tsoa/runtime';
import { Alpha as Beta, NS } from './referencedTypes';
import * as models from './referencedTypes';

/** @pattern ^[0-9]+$ */
export type Code = string;
export type A = Code;
export type B = Code;

/** Colors */
export enum Color {
  Red = 'red',
  Blue = 'blue',
}

export type Box<T> = T | null;

@Route('references')
export class ReferencesController {
  @Get('code')
  public async code(): Promise<Code> {
    return null as any;
  }

  @Get('a')
  public async a(): Promise<A> {
    return null as any;
  }

  @Get('b')
  public async b(): Promise<B> {
    return null as any;
  }

  @Get('color')
  public async color(): Promise<Color> {
    return null as any;
  }

  @Get('red')
  public async red(): Promise<Color.Red> {
    return null as any;
  }

  @Get('beta')
  public async beta(): Promise<Beta> {
    return null as any;
  }

  @Get('alpha')
  public async alpha(): Promise<models.Alpha> {
    return null as any;
  }

  @Get('inner')
  public async inner(): Promise<NS.Inner> {
    return null as any;
  }

  @Get('box')
  public async box(): Promise<Box<string>> {
    return null;
  }
}
