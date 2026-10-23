import { Get, Route } from '@tsoa/runtime';

interface Value {
  value: string;
}

interface Box<T> {
  child: T;
}

interface Box_Value_ {
  separate: number;
}

@Route('type-context-boundaries')
export class ExpressionCollisionController {
  @Get('generic')
  public generic(): Box<Value> {
    return { child: { value: 'value' } };
  }

  @Get('plain')
  public plain(): Box_Value_ {
    return { separate: 1 };
  }
}
