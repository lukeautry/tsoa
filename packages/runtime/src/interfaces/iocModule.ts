export interface IocContainer {
  get<T>(controller: { prototype: T }): T;
}

export type IocContainerFactory = (request: unknown) => IocContainer;
