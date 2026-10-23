import { Get, Route } from '@tsoa/runtime';

/** A closed template.
 * @default "item-one"
 */
type ClosedTemplate = `item-${'one' | 'two'}`;

/** A bound template.
 * @default "bound-one"
 */
type BoundTemplate<T extends string> = `bound-${T}`;

interface Box<T> {
  value?: T;
}

interface Target {
  closed?: ClosedTemplate;
  nullable?: ClosedTemplate | null;
  maybeUndefined?: ClosedTemplate | undefined;
  bound?: BoundTemplate<'one' | 'two'>;
  boxed: Box<ClosedTemplate>;
}

@Route('source-occurrences')
export class OptionalTemplatesController {
  @Get()
  public get(): Target {
    return { boxed: {} };
  }
}
