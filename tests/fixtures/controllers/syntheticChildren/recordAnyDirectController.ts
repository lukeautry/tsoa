import { Body, Post, Route } from '@tsoa/runtime';

@Route('synthetic-children')
export class RecordAnyDirectController {
  @Post()
  public post(@Body() value: Record<string, any>): Record<string, any> {
    return value;
  }
}
