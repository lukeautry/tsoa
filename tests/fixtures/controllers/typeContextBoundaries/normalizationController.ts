import { Get, Route } from '@tsoa/runtime';
import { Keep } from './models';

enum Single {
  Only = 'only',
}

interface Source {
  keyword: boolean;
  literals: true | false;
  whole: Single;
  member: Single.Only;
}

@Route('type-context-boundaries')
export class NormalizationController {
  @Get('computed')
  public computed(): Keep<Source> {
    return this.source();
  }

  @Get('source')
  public source(): Source {
    return { keyword: true, literals: false, whole: Single.Only, member: Single.Only };
  }
}
