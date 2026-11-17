import { createProgram, type CompilerOptions, type Program, type Type, type TypeChecker } from 'typescript';
import type * as NativeProgramModule from './native/program';
import { findInstalledPackage, selectCompiler } from './native/selectCompiler';

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
 * TypeScript's own program when the project in the working directory has TypeScript 5 or 6. With TypeScript 7 or tsrs
 * (or `TSOA_COMPILER_HELPER` set), a native compiler helper answers type questions and TypeScript 6 parses syntax.
 */
export function createMetadataProgram(rootFiles: string[], compilerOptions: CompilerOptions): MetadataProgram {
  const choice = selectCompiler({
    projectDirectory: process.cwd(),
    override: process.env.TSOA_COMPILER_HELPER,
    platform: process.platform,
    arch: process.arch,
    findPackage: findInstalledPackage,
  });
  if (choice.kind === 'typescript') {
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
  return createNativeProgram(choice.helperPath, rootFiles, compilerOptions);
}
