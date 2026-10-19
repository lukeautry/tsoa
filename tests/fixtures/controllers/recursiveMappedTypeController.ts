import { Body, Patch, Route } from '@tsoa/runtime';

/** All properties optional, at every depth. */
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** A JSON Merge Patch (RFC 7396) shape: like DeepPartial, but `null` deletes a key. */
type MergePatch<T> = { [K in keyof T]?: (T[K] extends object ? MergePatch<T[K]> : T[K]) | null };

interface Target {
  a: string;
  nested: Nested;
}

interface Nested {
  b: number;
  deeper: Deeper;
}

interface Deeper {
  c: boolean;
}

@Route('RecursiveMappedType')
export class RecursiveMappedTypeController {
  @Patch('DeepPartial')
  public async deepPartial(@Body() _body: DeepPartial<Target>): Promise<void> {
    return;
  }

  @Patch('MergePatch')
  public async mergePatch(@Body() _body: MergePatch<Target>): Promise<void> {
    return;
  }
}
