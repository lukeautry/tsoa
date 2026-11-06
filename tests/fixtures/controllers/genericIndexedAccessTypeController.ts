import { Get, Route } from '@tsoa/runtime';
import { GenericIndexed, PT } from '../testModel';

@Route('GenericIndexedAccessType')
export class GenericIndexedAccessTypeController {
  @Get()
  public async get(): Promise<GenericIndexed<PT.C>> {
    return new GenericIndexed(PT.C, { cField: 'hello' });
  }
}
