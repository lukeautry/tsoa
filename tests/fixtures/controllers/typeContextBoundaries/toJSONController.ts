import { Get, Route } from '@tsoa/runtime';
import { Optional } from './models';

interface ExplicitLeaf {
  explicitValue: string;
}

interface InferredLeaf {
  inferredValue: number;
}

class Explicit<T> {
  public toJSON(): Optional<T> {
    return {};
  }
}

class Inferred<T> {
  public toJSON() {
    const value: Optional<T> = {};
    return value;
  }
}

@Route('type-context-boundaries')
export class ToJSONController {
  @Get('explicit')
  public explicit(): Explicit<ExplicitLeaf> {
    return new Explicit<ExplicitLeaf>();
  }

  @Get('inferred')
  public inferred(): Inferred<InferredLeaf> {
    return new Inferred<InferredLeaf>();
  }
}
