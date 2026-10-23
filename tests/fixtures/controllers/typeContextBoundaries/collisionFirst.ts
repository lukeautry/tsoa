import { Get, Route } from '@tsoa/runtime';

export interface Same {
  first: string;
}

@Route('type-context-boundaries')
export class FirstCollisionController {
  @Get('first')
  public get(): Same {
    return { first: 'first' };
  }
}
