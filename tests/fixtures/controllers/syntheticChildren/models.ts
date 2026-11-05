export type Optional<T> = { [K in keyof T]?: T[K] };
export type P<T> = { [K in keyof T]?: T[K] };
export type Deep<T> = { [K in keyof T]?: T[K] extends object ? Deep<T[K]> : T[K] };
export type Keep<T> = { [K in keyof T]: T[K] };

export interface Leaf {
  text: string;
  count: number;
}

export interface Left {
  left: string;
}

export interface Right {
  right: number;
}

export type Maybe<T> = T | undefined;
export interface MaybeBox<T> {
  value?: Maybe<T>;
}
