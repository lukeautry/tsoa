import { Get, Route } from '@tsoa/runtime';

interface TupleBox<T> {
  value: T;
}

@Route('TupleNames')
export class TupleNamesController {
  @Get()
  public async get(): Promise<{ pair: TupleBox<[string, number]>; swapped: TupleBox<[number, string]> }> {
    return null as any;
  }
}
