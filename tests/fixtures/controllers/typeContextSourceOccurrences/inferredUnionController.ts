import { Get, Route } from '@tsoa/runtime';

/** A fractional count.
 * @isFloat
 */
type Fraction = number;

/** A whole count.
 * @isInt
 */
type Whole = number;

// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents -- The source aliases carry distinct numeric annotations.
type Result<T> = T | Fraction | Whole;

function helper(): Result<string> {
  return 1;
}

@Route('source-occurrences')
export class InferredUnionController {
  @Get()
  public get() {
    return helper();
  }
}
