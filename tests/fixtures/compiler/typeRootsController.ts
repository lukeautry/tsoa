import { Get, Route } from '@tsoa/runtime';

@Route('type-roots')
export class TypeRootsController {
  @Get()
  public get(): TypeRootsModel {
    return { label: 'ambient declaration' };
  }
}
