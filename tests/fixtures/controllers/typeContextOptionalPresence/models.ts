/** A whole count.
 * @isInt
 * @default 7
 */
export type Whole = number;

interface OptionalBase<T> {
  inherited?: T;
}

export interface OptionalValues<T = string> extends OptionalBase<T> {
  value?: T;
  nullable?: T | null;
  explicitUndefined?: T | undefined;
  count?: Whole;
  literals?: true | false;
}

class OptionalClassBase {
  inherited?: string;
}

export class OptionalClass extends OptionalClassBase {
  value?: string;
  nullable?: string | null;
  explicitUndefined?: string | undefined;
  count = 7;

  constructor(public token?: string) {
    super();
  }
}
