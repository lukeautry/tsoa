export interface Array<T> {
  head: T;
  tail: number;
}

export interface ReadonlyArray<T> {
  front: T;
  rest: number;
}
