import { Get, Route } from '@tsoa/runtime';
import { check, Kind } from './captureModels';

@Route('optional-capture/literals')
export class LiteralsController {
  @Get()
  public get() {
    return check({ yes: true, no: false, kind: Kind.One } as const);
  }
}
