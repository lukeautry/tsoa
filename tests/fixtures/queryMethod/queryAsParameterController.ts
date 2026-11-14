import { Get, Query, Route } from '@tsoa/runtime';

@Route('QueryAsParameter')
export class QueryAsParameterController {
  @Get()
  // @ts-expect-error Query is a method decorator
  public async get(@Query() name: string): Promise<string> {
    return name;
  }
}
