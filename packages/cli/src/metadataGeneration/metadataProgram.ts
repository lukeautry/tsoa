import { createProgram, type CompilerOptions, type Program, type Type, type TypeChecker } from 'typescript';
import type * as NativeProgramModule from './native/program';

/** The part of a program metadata generation reads. A native program holds a helper process until `close()`. */
export type MetadataProgram = Pick<Program, 'getTypeChecker' | 'getSourceFiles' | 'isSourceFileDefaultLibrary'> & { close(): void };

/** The checker methods tsoa's metadata generation calls; the native checker implements exactly these. */
export type MetadataChecker = Pick<
  TypeChecker,
  | 'getTypeAtLocation'
  | 'getTypeFromTypeNode'
  | 'getSymbolAtLocation'
  | 'getSignatureFromDeclaration'
  | 'getReturnTypeOfSignature'
  | 'getConstantValue'
  | 'getTypeOfSymbol'
  | 'getPropertiesOfType'
  | 'getPropertyOfType'
  | 'getIndexInfosOfType'
  | 'getIndexInfoOfType'
  | 'getIndexTypeOfType'
  | 'getSignaturesOfType'
  | 'getNonNullableType'
  | 'isTypeAssignableTo'
  | 'getUndefinedType'
  | 'getTypeArguments'
  | 'getBaseTypeOfLiteralType'
  | 'getAliasedSymbol'
  | 'isArrayType'
  | 'isTupleType'
  | 'typeToString'
  | 'typeToTypeNode'
> & { getUnionType(types: readonly Type[]): Type };

/**
 * TypeScript's own program, unless `TSOA_COMPILER_HELPER` names a native compiler helper (tsgo or tsrs speaking the
 * tsoa facts protocol), in which case TypeScript 6 parses syntax and the helper answers type questions.
 */
export function createMetadataProgram(rootFiles: string[], compilerOptions: CompilerOptions): MetadataProgram {
  const helper = process.env.TSOA_COMPILER_HELPER;
  if (!helper) {
    const program = createProgram(rootFiles, compilerOptions);
    return {
      getTypeChecker: () => program.getTypeChecker(),
      getSourceFiles: () => program.getSourceFiles(),
      isSourceFileDefaultLibrary: sourceFile => program.isSourceFileDefaultLibrary(sourceFile),
      close: () => {},
    };
  }
  // Required here so the default path loads no native code and registers no exit listener.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createNativeProgram } = require('./native/program') as typeof NativeProgramModule;
  return createNativeProgram(helper, rootFiles, compilerOptions);
}
