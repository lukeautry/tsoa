import { Get, Route } from '@tsoa/runtime';
import { OptionalEnum, Kind } from './captureModels';

@Route('optional-capture/enum')
export class EnumController {
  @Get()
  public get() {
    const result: OptionalEnum<Kind> = {};
    return result;
  }
}
