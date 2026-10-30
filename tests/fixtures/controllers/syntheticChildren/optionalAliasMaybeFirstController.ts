import { Get, Route } from '@tsoa/runtime';
import { Maybe, MaybeBox } from './models';

@Route('synthetic-children')
export class OptionalAliasMaybeFirstController {
  @Get('maybe')
  public maybe(): { value: Maybe<string> } {
    return { value: undefined };
  }

  @Get('box')
  public box(): MaybeBox<string> {
    return {};
  }
}
