import { Route, Get, Post, Path, Delete, Head } from '@tsoa/runtime';

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

  @Post(':anotherIdentifier') public postPathParamTest3(@Path() anotherIdentifier: string) {
    return anotherIdentifier;
  }

  @Post('{identifier}-{identifier2}') public postPathParamTest4(@Path() identifier: string) {
    return identifier;
  }

  @Post('test-{identifier}') public postPathParamPrefixTest1(@Path() identifier: string) {
    return identifier;
  }

  @Post('anothertest-{identifier}') public postPathParamPrefixTest2(@Path() identifier: string) {
    return identifier;
  }

  @Delete('Delete/{id}') public deletePathParamTest(@Path() id: string) {
    return id;
  }

  // This method should not report error cause its prefix route is different.
  @Delete('Delete2/{id}') public deletePathParamTest2(@Path() id: string) {
    return id;
  }

  @Delete('Delete/:identifier') public deletePathParamTest3(@Path() identifier: string) {
    return identifier;
  }

  // These two Head method should raise only warn but still work.
  @Head('Head/{id}') public headPathParamTest(@Path() id) {
    return id;
  }

  @Head('Head/{id}/{id2}') public headPathParamTest2(@Path() id, @Path() id2) {
    return { id, id2 };
  }
}
