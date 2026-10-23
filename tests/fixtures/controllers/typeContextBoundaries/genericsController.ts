import { Get, Route } from '@tsoa/runtime';
import { Optional } from './models';

interface DefaultLeaf {
  defaultValue: string;
}

interface ForwardLeaf {
  forwardedValue: number;
}

interface ShadowLeaf {
  shadowedValue: boolean;
}

interface Envelope<T> {
  value: T;
}

type Defaults<T = DefaultLeaf, U = Optional<T>> = Envelope<U>;
type Forward<U> = Defaults<U>;
type Scope<T> = Envelope<T>;
type Shadow<T> = Scope<Optional<T>>;

@Route('type-context-boundaries')
export class GenericsController {
  @Get('default')
  public defaults(): Defaults {
    return { value: {} };
  }

  @Get('forwarded')
  public forwarded(): Forward<ForwardLeaf> {
    return { value: {} };
  }

  @Get('shadowed')
  public shadowed(): Shadow<ShadowLeaf> {
    return { value: {} };
  }
}
