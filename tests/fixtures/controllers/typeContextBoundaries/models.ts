export interface Leaf {
  text: string;
  count: number;
}

export type Optional<T> = { [K in keyof T]?: T[K] };
export type Deep<T> = { [K in keyof T]?: T[K] extends object ? Deep<T[K]> : T[K] };
export type Keep<T> = { [K in keyof T]: T[K] };

export interface ArrayFirst {
  list: Array<Leaf>;
  readonlyList: readonly Leaf[];
  nested: Leaf;
}

export interface Reversed {
  nested: Leaf;
  readonlyList: readonly Leaf[];
  list: Array<Leaf>;
}

export interface Rotated {
  readonlyList: readonly Leaf[];
  nested: Leaf;
  list: Array<Leaf>;
}
