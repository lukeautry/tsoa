import { Get, Route } from '@tsoa/runtime';

/** @isFloat */
type Fraction = number;

/** @isInt */
type Whole = number;

type Node<T> = { value: T; next?: Node<T> };
type Forward<T> = Node<T>;

interface Target {
  whole: Forward<Whole>;
  fraction: Forward<Fraction>;
}

@Route('source-occurrences')
export class RecursiveWholeFirstController {
  @Get()
  public get(): Target {
    return { whole: { value: 1 }, fraction: { value: 1.5 } };
  }
}
