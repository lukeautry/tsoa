export interface IocContainer {
  get<T>(controller: { prototype: T }): T;

  get<T>(controller: { prototype: T }): Promise<T>;
}

export type IocContainerFactory<T = any> = (request: T) => IocContainer;
