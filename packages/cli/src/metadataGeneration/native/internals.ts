/**
 * The only place the native program touches TypeScript compiler internals. Each helper says why.
 */
import * as path from 'node:path';
import * as ts from 'typescript';

type TypeConstructor = new (checker: ts.TypeChecker, flags: ts.TypeFlags) => ts.Type;
type SymbolConstructor = new (flags: ts.SymbolFlags, name: ts.__String) => ts.Symbol;
type SignatureConstructor = new (checker: ts.TypeChecker, flags: number) => ts.Signature;

interface TypeScriptInternals {
  objectAllocator: {
    getTypeConstructor(): TypeConstructor;
    getSymbolConstructor(): SymbolConstructor;
    getSignatureConstructor(): SignatureConstructor;
  };
  convertToTSConfig(
    configParseResult: ts.ParsedCommandLine,
    configFileName: string,
    host: { getCurrentDirectory(): string; useCaseSensitiveFileNames: boolean },
  ): { compilerOptions: Record<string, unknown> };
  isDeclaration(node: ts.Node): boolean;
  isJSDocTag(node: ts.Node): boolean;
}

const internals = ts as unknown as TypeScriptInternals;

/**
 * TypeScript 6's own Type, Symbol and Signature classes. Native types and symbols are instances of them, so their
 * methods (getProperties, isUnion, getDocumentationComment, ...) work and forward to the native checker.
 */
export function objectConstructors() {
  return {
    Type: internals.objectAllocator.getTypeConstructor(),
    Symbol: internals.objectAllocator.getSymbolConstructor(),
    Signature: internals.objectAllocator.getSignatureConstructor(),
  };
}

/** Options in tsconfig.json form (enum names, paths relative to `<directory>/tsconfig.json`), as a helper's config parser reads them. */
export function tsconfigCompilerOptions(options: ts.CompilerOptions, directory: string): Record<string, unknown> {
  const host = { getCurrentDirectory: () => directory, useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames };
  return internals.convertToTSConfig({ options, fileNames: [], errors: [] }, path.join(directory, 'tsconfig.json'), host).compilerOptions;
}

/** Where relative paths in the options resolve: `pathsBasePath` (set for `paths`), else the tsconfig's directory. */
export function optionsDirectory(options: ts.CompilerOptions): string | undefined {
  const { pathsBasePath, configFilePath } = options as { pathsBasePath?: string; configFilePath?: string };
  if (pathsBasePath) return pathsBasePath;
  return configFilePath ? path.dirname(configFilePath) : undefined;
}

/** Nodes the binder gives a symbol. */
export function isDeclaration(node: ts.Node): boolean {
  return internals.isDeclaration(node) || ts.isSourceFile(node);
}

export function isJSDocTag(node: ts.Node): boolean {
  return internals.isJSDocTag(node);
}

/** The binder's `node.symbol`, which TypeScript 6 code (JSDoc inheritance) and tsoa's `boundSymbol` read; computed on first read. */
export function defineBoundSymbol(node: ts.Node, compute: () => ts.Symbol | undefined): void {
  Object.defineProperty(node, 'symbol', {
    configurable: true,
    get() {
      const value = compute();
      Object.defineProperty(this, 'symbol', { value, writable: true, configurable: true });
      return value;
    },
  });
}

/** Marks a re-parsed printed type node as synthetic (`pos = end = -1`), as the checker's node builder makes them. */
export function markSynthesized(node: ts.Node): void {
  const mutable = node as { pos: number; end: number; flags: ts.NodeFlags };
  mutable.pos = -1;
  mutable.end = -1;
  mutable.flags |= ts.NodeFlags.Synthesized;
}

export function detachFromParent(node: ts.Node): void {
  (node as { parent: ts.Node | undefined }).parent = undefined;
}
