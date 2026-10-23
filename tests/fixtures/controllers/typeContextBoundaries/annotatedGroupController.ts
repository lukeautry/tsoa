import { Get, Route } from '@tsoa/runtime';

/** Integer description.
 * @isInt
 * @default 3
 */
type IntegerView = number;

interface Box<T> {
  value: T;
}

type Optional<T> = { [K in keyof T]?: T[K] };
type Keep<T> = { [K in keyof T]: T[K] };
type Annotated<T, U = T> = Box<IntegerView> | Optional<U>;

interface Left {
  left: string;
}

interface Forwarded<T, U = T> {
  value: number | Annotated<U> | null;
}

@Route('type-context-boundaries')
export class AnnotatedGroupController {
  @Get('annotated-group')
  public group(): Keep<Forwarded<Left>> {
    return { value: 0 };
  }
}
