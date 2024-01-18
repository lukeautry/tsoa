import { Body } from '@tsoa/runtime/decorators/parameter';
import { Post } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';


export enum MixedStringAndNumberEnum {
  one = 1,
  two = 'two',
  three = 3,
  four = 'four',
}

export interface BodyWithMixedEnum {
  anEnumValue: MixedStringAndNumberEnum;
}

@Route('MixedEnumTest')
export class MixedEnumController extends Controller {
  @Post()
  public async saveEnumValue(@Body() body: BodyWithMixedEnum): Promise<BodyWithMixedEnum> {
    return body;
  }
}
