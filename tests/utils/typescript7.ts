// The TypeScript 7 API, for tests that check what the compiler itself does. tsoa needs no TypeScript package; the
// repository's own tooling stays on TypeScript 6, so the tests reach TypeScript 7 through the `typescript7` alias.
import type { CompilerOptions } from '@tsoa/cli/compilerOptions';
import { API, type CompilerOptions as ApiCompilerOptions } from 'typescript7/sync';

export { ModuleKind, ModuleResolutionKind } from 'typescript7/sync';
export { ScriptTarget } from 'typescript7/ast';
export type { CompilerOptions };

// tsoa's compiler options and the API's are the same values; the API's type brands its paths.
export const toApiOptions = (options: CompilerOptions) => options as unknown as ApiCompilerOptions;
export const fromApiOptions = (options: ApiCompilerOptions) => options as unknown as CompilerOptions;

let api: API | undefined;

export function getApi(): API {
  return (api ??= new API({ cwd: process.cwd() }));
}
