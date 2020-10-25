import { Route, Get, Post, Path } from '@tsoa/runtime';

@Route('GetTest')
export class DuplicatePathParamTestController {
  @Get('{id}') public getPathParamTest(@Path() id: string) {
    return id;
  }

  @Get('{identifier}') public getPathParamTest2(@Path() identifier: string) {
    return identifier;
  }

  @Post('{id}') public postPathParamTest(@Path() id: string) {
    return id;
  }

  @Post('{identifier}') public postPathParamTest2(@Path() identifier: string) {
    return identifier;
  }

  @Post('{anotherIdentifier}') public postPathParamTest3(@Path() anotherIdentifier: string) {
    return anotherIdentifier;
  }
}
