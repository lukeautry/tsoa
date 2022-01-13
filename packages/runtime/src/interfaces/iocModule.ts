export interface IocContainer {
  get<T>(controller: { prototype: T }): T;

  get<T>(controller: { prototype: T }): Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IocContainerFactory<T = any> = (request: T) => IocContainer;
