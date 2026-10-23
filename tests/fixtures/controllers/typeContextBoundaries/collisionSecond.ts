import { Get, Route } from '@tsoa/runtime';

export interface Same {
  second: number;
}

@Route('type-context-boundaries')
export class SecondCollisionController {
  @Get('second')
  public get(): Same {
    return { second: 2 };
  }
}
