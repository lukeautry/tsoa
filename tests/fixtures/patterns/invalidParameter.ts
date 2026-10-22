import { Get, Query, Route } from '@tsoa/runtime';

@Route('InvalidPatterns')
export class InvalidParameterPatternController {
  /** @pattern value `^a\` b$` Invalid value */
  @Get()
  public get(@Query() value: string): void {}
}
