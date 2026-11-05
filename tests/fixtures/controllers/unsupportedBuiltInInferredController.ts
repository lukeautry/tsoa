import { Get, Route } from '@tsoa/runtime';

@Route('UnsupportedBuiltInInferred')
export class UnsupportedBuiltInInferredController {
  @Get()
  public async get() {
    return { tags: new Set<string>() };
  }
}
