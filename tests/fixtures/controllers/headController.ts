import { Head, QueryParam, Route } from '@tsoa/runtime';

@Route('HeadTest')
export class HeadTestController {
  @Head()
  public async resourceExists(): Promise<void> {
    return;
  }

  @Head('Current')
  public async resourceExistsCurrent(): Promise<void> {
    return;
  }

  @Head('{numberPathParam}/{booleanPathParam}/{stringPathParam}')
  public async resourceExistsByParams(
    numberPathParam: number,
    stringPathParam: string,
    booleanPathParam: boolean,
    @QueryParam() booleanParam: boolean,
    @QueryParam() stringParam: string,
    @QueryParam() numberParam: number,
  ): Promise<void> {
    return;
  }
}
