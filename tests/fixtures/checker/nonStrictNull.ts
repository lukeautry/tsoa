import { Get, Route } from '@tsoa/runtime';

export interface User {
  id: string;
}

export interface Page<T> {
  items: T[];
}

@Route('nonStrictNull')
export class NonStrictNullController {
  @Get()
  public async m(): Promise<Page<User | null>> {
    return null as any;
  }
}
