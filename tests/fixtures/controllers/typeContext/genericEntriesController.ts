import { Get, Route } from '@tsoa/runtime';

interface TextValue {
  text: string;
}

interface CountValue {
  count: number;
}

interface Envelope<T> {
  value: T;
}

type Optional<T> = { [K in keyof T]?: T[K] };
type Wrapped<T> = Envelope<Optional<T>>;
type Value<T> = Envelope<T>['value'];

function inferredValue(): Wrapped<CountValue> {
  return { value: {} };
}

@Route('type-context')
export class GenericEntriesController {
  @Get('nested')
  public nested(): Wrapped<TextValue> {
    return { value: {} };
  }

  @Get('indexed')
  public indexed(): Value<Optional<CountValue>> {
    return {};
  }

  @Get('inferred')
  public inferred() {
    return inferredValue();
  }
}
