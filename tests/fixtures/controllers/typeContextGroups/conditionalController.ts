import { Body, Post, Route } from '@tsoa/runtime';

interface Left {
  left: string;
}

type Keep<T> = { [K in keyof T]: T[K] };
type Optional<T> = { [K in keyof T]?: T[K] };
type Group<T, U = T> = T | (U extends object ? Optional<U> : U[]);
interface Forwarded<T, U = T> {
  value: number | Group<U> | null;
}
type Target = Forwarded<Left>;

@Route('group')
export class ConditionalController {
  @Post()
  public post(@Body() body: Keep<Target>): Keep<Target> {
    return body;
  }
}
