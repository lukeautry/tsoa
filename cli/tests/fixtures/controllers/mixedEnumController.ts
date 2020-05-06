import { Body, Controller, Post, Route } from '@tsoa/runtime';

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
