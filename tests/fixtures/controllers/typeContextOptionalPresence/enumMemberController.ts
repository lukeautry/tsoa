import { Get, Route } from '@tsoa/runtime';
import { OptionalEnum, Kind } from './captureModels';

@Route('optional-capture/enumMember')
export class EnumMemberController {
  @Get()
  public get() {
    const result: OptionalEnum<Kind.One> = {};
    return result;
  }
}
