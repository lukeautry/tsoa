import { Body, Get, Post, Queries, Route } from '@tsoa/runtime';
import { Optional } from './models';

interface BodyLeaf {
  bodyValue: string;
}

interface QueryValues {
  search: string;
  limit: number;
}

function bodyValue(): Optional<BodyLeaf> {
  return {};
}

function queryValues(): Optional<QueryValues> {
  return {};
}

@Route('type-context-boundaries')
export class ParametersController {
  @Post('body')
  public body(@Body() value = bodyValue()): void {
    void value;
  }

  @Get('queries')
  public queries(@Queries() values = queryValues()): void {
    void values;
  }
}
