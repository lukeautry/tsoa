import { Get, Route } from '@tsoa/runtime';

type Recursive = string | Recursive[];

@Route('type-context-boundaries')
export class RecursiveAliasController {
  @Get('recursive-alias')
  public alias(): Recursive {
    return '';
  }
}
