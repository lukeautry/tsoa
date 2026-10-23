export interface OptionalTemplate<T extends string | boolean> {
  value?: `x-${T}`;
}

export interface Left {
  left: string;
}

export interface Right {
  right: number;
}

export interface OptionalKeys<T> {
  value?: keyof T;
}

export interface OptionalConditional<T> {
  value?: T extends Left ? string : number;
}

export enum Kind {
  One = 'one',
  Two = 'two',
}

export interface OptionalEnum<T> {
  value?: T extends Kind ? 'enum' : 'erased';
}

export interface Box<T> {
  value?: Partial<T>;
}

export function box<T>(value: T): Box<T> {
  return { value };
}

export interface LiteralCheck<T> {
  value?: T extends { yes: true; no: false; kind: Kind.One } ? 'retained' : 'changed';
}

export function check<T>(value: T): LiteralCheck<T> {
  void value;
  return {};
}

export interface TupleValue<T> {
  value?: T extends readonly unknown[] ? T : never;
}

export interface TupleLength<T> {
  value?: T extends readonly unknown[] ? T['length'] : never;
}

export interface ArrayMutability<T> {
  value?: T extends readonly unknown[] ? (T extends unknown[] ? 'mutable' : 'readonly') : 'changed';
}

export type Array<T> = { unrelated: T };
export type ReadonlyArray<T> = { readonly unrelated: T };
