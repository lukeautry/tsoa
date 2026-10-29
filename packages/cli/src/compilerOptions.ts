/**
 * TypeScript compiler options in the form of the compiler's API: enum options such as `target` and `module` hold the
 * numbers of the compiler's enums, as `parseConfigFile` of `typescript/sync` returns them.
 */
export interface CompilerOptions {
  [option: string]: unknown;
  baseUrl?: string;
  configFilePath?: string;
  customConditions?: string[];
  experimentalDecorators?: boolean;
  module?: number;
  moduleResolution?: number;
  paths?: Record<string, string[]>;
  rootDir?: string;
  strict?: boolean;
  strictNullChecks?: boolean;
  target?: number;
  typeRoots?: string[];
}
