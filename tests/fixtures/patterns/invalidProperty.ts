import { Body, Post, Route } from '@tsoa/runtime';

interface InvalidPatternBody {
  /** @pattern `[a z` Invalid value */
  value: string;
}

@Route('InvalidPatterns')
export class InvalidPropertyPatternController {
  @Post()
  public create(@Body() body: InvalidPatternBody): void {}
}
