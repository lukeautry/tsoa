import { Get, Route } from '@tsoa/runtime';

export interface GroupHolder {
  id: string;
  groups: Array<{ members: Map<string, number> }>;
}

@Route('UnsupportedBuiltInNested')
export class UnsupportedBuiltInNestedController {
  @Get()
  public async get(): Promise<Omit<GroupHolder, 'id'>> {
    return null as any;
  }
}
