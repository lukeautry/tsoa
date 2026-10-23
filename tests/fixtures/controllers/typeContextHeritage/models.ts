export interface Left {
  left: string;
  amount: number;
  shared?: string;
}

export interface Right {
  right: number;
  shared?: string;
}

export type Base<T> = { [K in keyof T]?: T[K] };

export interface Derived extends Base<Left> {
  extra: string;
}

export class DerivedClass implements Base<Left> {
  public shared?: string;
  public classExtra = true;
}

export type Slot<T> = { [K in 'value']?: T };

export interface Generic<T> extends Slot<T> {
  extra: string;
}

export interface ObjectGeneric<T> extends Base<{ value: T }> {
  extra: string;
}

export interface Sibling extends Base<Left>, Base<Right> {
  shared: 'own';
  extra: boolean;
}

export type Slots<T> = { [K in 'value' | 'other']?: T };

export class GenericClass<T> implements Slots<T> {
  public value?: T;
  public extra = 'extra';
}
