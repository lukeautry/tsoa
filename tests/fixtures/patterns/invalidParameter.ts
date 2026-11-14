import { Get, QueryParam, Route } from '@tsoa/runtime';

@Route('InvalidPatterns')
export class InvalidParameterPatternController {
  /** @pattern value `^a\` b$` Invalid value */
  @Get()
  public get(@QueryParam() value: string): void {}
}
