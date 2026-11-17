import { Body, Path, Query, QueryParam, Route } from '@tsoa/runtime';

export interface ContactFilter {
  surname: string;
  limit?: number;
}

export interface ContactSearchResult {
  surname: string;
  limit: number;
  page?: number;
  tenant?: string;
}

@Route('QueryMethodTest')
export class QueryMethodTestController {
  @Query()
  public async search(@Body() filter: ContactFilter, @QueryParam() page?: number): Promise<ContactSearchResult> {
    return { surname: filter.surname, limit: filter.limit ?? 10, page };
  }

  @Query('{tenant}')
  public async searchTenant(@Path() tenant: string, @Body() filter: ContactFilter): Promise<ContactSearchResult> {
    return { surname: filter.surname, limit: filter.limit ?? 10, tenant };
  }
}
