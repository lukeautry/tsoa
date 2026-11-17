import { Body, Post, QueryParam, Route } from '@tsoa/runtime';

interface PatternBody {
  /** @pattern `^[a-z ]+$` Only letters and spaces */
  value: string;
}

@Route('Patterns')
export class PatternController {
  /** @pattern value `^a b$` Expected a b */
  @Post()
  public create(@Body() body: PatternBody, @QueryParam() value: string): void {}
}
