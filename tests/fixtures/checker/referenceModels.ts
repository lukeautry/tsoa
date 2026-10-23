import { Get, Route } from '@tsoa/runtime';

export interface User {
  id: string;
}
export type A = User;
export type B = User;

export interface Merged {
  a: string;
}
export interface Merged {
  b: number;
}

export interface BaseModel {
  items: Item[];
}
export interface Item extends BaseModel {
  name: string;
}

@Route('referenceModels')
export class ReferenceModelsController {
  @Get('a')
  public async a(): Promise<A> {
    return null as any;
  }

  @Get('b')
  public async b(): Promise<B> {
    return null as any;
  }

  @Get('merged')
  public async merged(): Promise<Merged> {
    return null as any;
  }

  @Get('base')
  public async base(): Promise<BaseModel> {
    return null as any;
  }
}
