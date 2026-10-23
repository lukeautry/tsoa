import { Get, Route } from '@tsoa/runtime';

/** A whole count.
 * @isInt
 * @default 7
 */
type IntegerView = number;

type Group<T> = { value: T; fixed: IntegerView };
type Keep<T> = { [K in keyof T]: T[K] };

interface Target {
  group: Group<number>;
}

@Route('source-occurrences')
export class ValueFirstController {
  @Get()
  public get(): Keep<Target> {
    return { group: { value: 1.5, fixed: 7 } };
  }
}
