import { Get, Route } from '@tsoa/runtime';
import { ConfigValue, EventUnion, ForeignIndexedValue } from '../testModel';

@Route('IndexedAccessType')
export class IndexedAccessTypeController {
  @Get('ForeignIndexedValue')
  public async getForeignIndexedValue(): Promise<ForeignIndexedValue> {
    return 'FOO';
  }

  @Get('EventUnion')
  public async getEventUnion(): Promise<EventUnion> {
    return { kind: 'click', payload: { x: 0, y: 0 } };
  }

  @Get('ConfigValue')
  public async getConfigValue(): Promise<ConfigValue> {
    return 'A';
  }
}
