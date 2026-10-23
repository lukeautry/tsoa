import { Get, Route } from '@tsoa/runtime';
import { Deep, Rotated } from './models';

@Route('type-context-boundaries')
export class RotatedController {
  @Get()
  public get(): Deep<Rotated> {
    return {};
  }
}
