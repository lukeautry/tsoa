import { Get, QueryParam, Route } from '@tsoa/runtime';

@Route('BufferWithoutNodeTypes')
export class BufferWithoutNodeTypesController {
  @Get()
  public async getBuffer(@QueryParam() buffer: Buffer): Promise<Buffer> {
    return buffer;
  }
}
