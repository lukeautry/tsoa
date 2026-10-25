export type Opt<T> = { [K in keyof T]?: T[K] | null };
