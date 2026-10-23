import { Body, Post, Route } from 'tsoa';

@Route('DirectIndexValues')
export class TypeContextIndexValuesDirectController {
  @Post('values')
  public accept(@Body() value: Record<string, any>): Record<string, any> {
    return value;
  }
}
