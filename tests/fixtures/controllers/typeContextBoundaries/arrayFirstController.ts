import { Get, Route } from '@tsoa/runtime';
import { ArrayFirst, Deep } from './models';

@Route('type-context-boundaries')
export class ArrayFirstController {
  @Get()
  public get(): Deep<ArrayFirst> {
    return {};
  }
}
