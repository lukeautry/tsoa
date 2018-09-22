import {
  Head, Query, Route,
} from '../../../src';

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
    @Query() booleanParam: boolean,
    @Query() stringParam: string,
    @Query() numberParam: number): Promise<void> {
    return;
  }
}
