import { Get, Route } from '@tsoa/runtime';
import { Keep, Optional } from './models';

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace First {
  export interface Nested {
    a: string;
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Second {
  export interface Nested {
    b: number;
  }
}

interface Holder {
  value: Optional<First.Nested> | Optional<Second.Nested>;
}

@Route('synthetic-children')
export class SharedPrintController {
  @Get()
  public get(): Keep<Holder> {
    return { value: {} };
  }
}
