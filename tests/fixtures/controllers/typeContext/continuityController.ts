import { Get, Route } from '@tsoa/runtime';

class InheritedBase {
  public id!: string;
}

class AnnotatedModel extends InheritedBase {
  /**
   * A display label.
   * @minLength 3
   * @maxLength 20
   * @pattern ^[a-z]+$
   * @example "sample"
   * @deprecated
   */
  public label = 'ready';
}

type RecursiveNode = {
  label: string;
  children: RecursiveNode[];
};

@Route('type-context')
export class ContinuityController {
  @Get('annotated')
  public annotated(): Partial<AnnotatedModel> {
    return {};
  }

  @Get('recursive')
  public recursive(): RecursiveNode {
    return { label: 'root', children: [] };
  }
}
