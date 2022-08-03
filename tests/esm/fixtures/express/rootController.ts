import { Controller, Get, Route } from '@namecheap/tsoa-runtime';
import type { TestModel } from '../testModel.js';

@Route()
export class RootController extends Controller {
  @Get()
  public async rootHandler(): Promise<TestModel> {
    return {
      str: 'str',
    };
  }
}
