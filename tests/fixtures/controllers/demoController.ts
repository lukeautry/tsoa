import {
  Controller,
  Get,
  Route,
} from '../../../src';

export interface Response<T> {
  data: T;
  page: number;
}

export interface User {
  name: string;
  age: number;
}

@Route('Demo')
export class DemoController extends Controller {
  @Get()
  public async hello(): Promise<Response<User[]>> {
    return null;
    // return {
    //   data: {
    //     age: 12,
    //     name: 'Isman',
    //   },
    //   page: 1
    // };
  }
}
