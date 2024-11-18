export type Newable<
  T = unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TArgs extends unknown[] = any[],
> = new (...args: TArgs) => T;

export type ServiceIdentifier<T = unknown> =
  | string
  | symbol
  | Newable<T>
  // eslint-disable-next-line @typescript-eslint/ban-types
  | Function;

export interface IocContainer {
  get<T>(controller: ServiceIdentifier<T>): T;
  get<T>(controller: ServiceIdentifier<T>): Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IocContainerFactory<T = any> = (request: T) => IocContainer;
