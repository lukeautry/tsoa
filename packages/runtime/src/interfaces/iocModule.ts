export interface IocContainer {
  get<T>(controller: { prototype: T }): T;

  get<T>(controller: { prototype: T }): Promise<T>;
}

export type IocContainerFactory = (request: unknown) => IocContainer;
