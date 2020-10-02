export interface TsoaIocContainer {
  get<T>(controller: any): T;
}

export type TsoaIocContainerMethod = (request: any) => TsoaIocContainer;
