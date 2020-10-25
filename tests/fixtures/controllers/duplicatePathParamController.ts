import { Route, Get, Post, Path } from '@tsoa/runtime';

@Route('GetTest')
export class DuplicatePathParamTestController {
  @Get('{id}') public pathParamTest(@Path() id: string) {
    return id;
  }

  @Get('{identifier}') public pathParamTest2(@Path() identifier: string) {
    return identifier;
  }

  @Post('{identifier}') public pathParamTest3(@Path() identifier: string) {
    return identifier;
  }
}
