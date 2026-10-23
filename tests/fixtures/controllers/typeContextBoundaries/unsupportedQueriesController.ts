import { Get, Queries, Route } from '@tsoa/runtime';

interface NestedQuery {
  nested: NestedValue;
}

interface NestedValue {
  value: string;
}

@Route('type-context-boundaries')
export class UnsupportedQueriesController {
  @Get()
  public get(@Queries() values: NestedQuery): void {
    void values;
  }
}
