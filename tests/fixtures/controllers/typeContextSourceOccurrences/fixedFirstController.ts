import { Get, Route } from '@tsoa/runtime';

/** A whole count.
 * @isInt
 * @default 7
 */
type IntegerView = number;

type Group<T> = { fixed: IntegerView; value: T };
type Keep<T> = { [K in keyof T]: T[K] };

interface Target {
  group: Group<number>;
}

@Route('source-occurrences')
export class FixedFirstController {
  @Get()
  public get(): Keep<Target> {
    return { group: { fixed: 7, value: 1.5 } };
  }
}
