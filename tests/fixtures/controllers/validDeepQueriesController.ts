import { Controller, Get, Route, Query, Queries } from '@tsoa/runtime';

interface DeepObjectFilter {
  field: string;
  operator: string;
  value: string;
}

interface CriteriaParams {
  filters?: DeepObjectFilter[];
  orderBy?: string;
  order?: string;
}

interface NestedObjectParams {
  simpleField: string;
  nestedObject: {
    nestedField: string;
    deeperNested: {
      deepField: number;
    };
  };
}

@Route('valid-deep-queries')
export class ValidDeepQueriesController extends Controller {
  @Get('with-deep-queries')
  public withDeepQueries(@Queries() criteria: CriteriaParams): string {
    return 'success';
  }

  @Get('with-nested-object-queries')
  public withNestedObjectQueries(@Queries() params: NestedObjectParams): string {
    return 'success';
  }

  @Get('with-single-deep-query')
  public withSingleDeepQuery(@Query() filter: DeepObjectFilter): string {
    return 'success';
  }

  @Get('with-array-deep-query')
  public withArrayDeepQuery(@Query() filters: DeepObjectFilter[]): string {
    return 'success';
  }
}
