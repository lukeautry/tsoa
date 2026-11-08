import { Body, Post, Route } from '@tsoa/runtime';

@Route('UnsupportedBuiltIn')
export class UnsupportedBuiltInController {
  @Post()
  public async post(@Body() body: { tags: Set<string> }): Promise<void> {
    return;
  }
}
