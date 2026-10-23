import { Body, Post, Route } from '@tsoa/runtime';

type Keep<T> = { [K in keyof T]: T[K] };
type Optional<T> = { [K in keyof T]?: T[K] };

interface Left {
  left: string;
}

interface Right {
  right: number;
}

interface Target {
  value: Optional<Left> | Optional<Right>;
  marker: string;
}

@Route('type-context-boundaries')
export class UnionOptionalController {
  @Post('optional-union')
  public optionalUnion(@Body() body: Keep<Target>): Keep<Target> {
    return body;
  }
}
