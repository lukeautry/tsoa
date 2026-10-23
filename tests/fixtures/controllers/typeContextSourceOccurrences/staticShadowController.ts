import { Get, Route } from '@tsoa/runtime';

class Base {
  public value!: string;
}

class Derived extends Base {
  public static value = 1;
}

@Route('source-occurrences')
export class StaticShadowController {
  @Get()
  public get(): Derived {
    return new Derived();
  }
}
