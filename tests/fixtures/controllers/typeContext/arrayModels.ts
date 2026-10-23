export interface Nested {
  text: string;
  count: number;
}

export interface Left {
  left: string;
}

export interface Right {
  right: number;
}

export enum Shade {
  Red = 'red',
  Blue = 'blue',
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
