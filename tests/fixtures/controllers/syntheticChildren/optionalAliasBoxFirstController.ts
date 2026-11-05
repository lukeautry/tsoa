import { Get, Route } from '@tsoa/runtime';
import { Maybe, MaybeBox } from './models';

@Route('synthetic-children')
export class OptionalAliasBoxFirstController {
  @Get('box')
  public box(): MaybeBox<string> {
    return {};
  }

  @Get('maybe')
  public maybe(): { value: Maybe<string> } {
    return { value: undefined };
  }
}
