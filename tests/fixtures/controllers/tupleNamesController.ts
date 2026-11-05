import { Get, Route } from '@tsoa/runtime';

/** @pattern ^x */
type TupleId = string;

interface TupleBox<T> {
  value: T;
}

@Route('TupleNames')
export class TupleNamesController {
  @Get()
  public async get(): Promise<{ pair: TupleBox<[string, number]>; swapped: TupleBox<[number, string]> }> {
    return null as any;
  }

  @Get('Readonly')
  public async getReadonly(): Promise<{ ids: readonly [TupleId] }> {
    return null as any;
  }
}
