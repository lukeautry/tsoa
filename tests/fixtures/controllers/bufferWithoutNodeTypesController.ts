import { Get, Query, Route } from '@tsoa/runtime';

@Route('BufferWithoutNodeTypes')
export class BufferWithoutNodeTypesController {
  @Get()
  public async getBuffer(@Query() buffer: Buffer): Promise<Buffer> {
    return buffer;
  }
}
