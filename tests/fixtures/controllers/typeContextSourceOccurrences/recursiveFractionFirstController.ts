import { Get, Route } from '@tsoa/runtime';

/** @isFloat */
type Fraction = number;

/** @isInt */
type Whole = number;

type Node<T> = { value: T; next?: Node<T> };
type Forward<T> = Node<T>;

interface Target {
  fraction: Forward<Fraction>;
  whole: Forward<Whole>;
}

@Route('source-occurrences')
export class RecursiveFractionFirstController {
  @Get()
  public get(): Target {
    return { fraction: { value: 1.5 }, whole: { value: 1 } };
  }
}
