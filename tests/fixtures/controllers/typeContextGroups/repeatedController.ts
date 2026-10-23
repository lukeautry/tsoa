import { Body, Post, Route } from '@tsoa/runtime';

interface Left {
  left: string;
}

interface Right {
  right: number;
}

type Keep<T> = { [K in keyof T]: T[K] };
type Group<T, U = T> = T | { [K in keyof U]?: U[K] };
interface Forwarded<T, U = T> {
  value: number | Group<T> | Group<U> | null;
}
type Target = Forwarded<Left, Right>;

@Route('group')
export class RepeatedController {
  @Post()
  public post(@Body() body: Keep<Target>): Keep<Target> {
    return body;
  }
}
