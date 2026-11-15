import { createProgram, type CompilerOptions, type Program } from 'typescript';
import { createNativeProgram } from './native/program';

/** The part of a program metadata generation reads. A native program also holds a helper process until `close()`. */
export type MetadataProgram = Pick<Program, 'getTypeChecker' | 'getSourceFiles' | 'isSourceFileDefaultLibrary'> & { close?(): void };

/**
 * TypeScript's own program, unless `TSOA_COMPILER_HELPER` names a native compiler helper (tsgo or tsrs speaking the
 * tsoa facts protocol), in which case TypeScript 6 parses syntax and the helper answers type questions.
 */
export function createMetadataProgram(rootFiles: string[], compilerOptions: CompilerOptions): MetadataProgram {
  const helper = process.env.TSOA_COMPILER_HELPER;
  return helper ? createNativeProgram(helper, rootFiles, compilerOptions) : createProgram(rootFiles, compilerOptions);
}
