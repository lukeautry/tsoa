import { Get, Route } from '@tsoa/runtime';

export type Str = string;
/** @isInt */
export type Int = number;
export type Num = number;
export type Vd = void;
export type Und = undefined;
export type Anything = any;
export type Unk = unknown;
export type Obj = object;
export type Bool = boolean;
export type Nv = never;
export type Lit = 'a' | 'b' | null;
export type WrittenBooleans = true | false;
export type StrOrBool = string | boolean;
export type Tup = [string, ...number[]];
export type Arr = readonly number[];
export type Upper = Uppercase<'abc' | 'def'>;
export type Template = `user_${string}`;
export type FiniteTemplate = `a${'c' | 'd'}`;
export type NullableString = string | null;
export type Neg = -1;

@Route('dispatch')
export class DispatchController {
  @Get()
  public async m(): Promise<Str> {
    return null as any;
  }
}
