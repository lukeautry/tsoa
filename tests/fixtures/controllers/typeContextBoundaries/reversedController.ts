import { Get, Route } from '@tsoa/runtime';
import { Deep, Reversed } from './models';

@Route('type-context-boundaries')
export class ReversedController {
  @Get()
  public get(): Deep<Reversed> {
    return {};
  }
}
