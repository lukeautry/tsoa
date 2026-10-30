import type * as ts from 'typescript';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { nativeCompiler, NativeSync, NativeAST } from './native';

// Consumers use ts.X as both types and values; only a module supplies both namespaces.
// Keep each runtime name listed once; collapsing the facade requires consumer type-import changes.
// Type-only star exports cannot forward TypeScript's export = declarations.
export type {
  ArrayLiteralExpression,
  CallExpression,
  ClassDeclaration,
  ClassElement,
  CompilerOptions,
  ConstructorDeclaration,
  Declaration,
  Decorator,
  Diagnostic,
  EntityName,
  EnumDeclaration,
  EnumMember,
  Expression,
  ExpressionWithTypeArguments,
  HeritageClause,
  HasInitializer,
  HasModifiers,
  HasType,
  Identifier,
  ImportSpecifier,
  IndexSignatureDeclaration,
  IndexedAccessTypeNode,
  InterfaceDeclaration,
  IntersectionTypeNode,
  JSDoc,
  JSDocComment,
  JSDocLink,
  JSDocTag,
  JSDocText,
  LiteralExpression,
  LiteralType,
  LiteralTypeNode,
  MethodDeclaration,
  ModuleDeclaration,
  NewExpression,
  Node,
  NodeArray,
  NumberLiteralType,
  NumericLiteral,
  ObjectLiteralExpression,
  ObjectType,
  ParameterDeclaration,
  PrefixUnaryExpression,
  Program,
  PropertyDeclaration,
  PropertySignature,
  PseudoBigInt,
  StringLiteral,
  StringLiteralType,
  SourceFile,
  Symbol,
  SymbolDisplayPart,
  Token,
  TupleType,
  Type,
  TypeAliasDeclaration,
  TypeChecker,
  TypeElement,
  TypeNode,
  TypeOperatorNode,
  TypeParameterDeclaration,
  TypeReference,
  TypeReferenceNode,
  TypeReferenceType,
  UnionType,
  UnionTypeNode,
  __String,
} from 'typescript';

const activeCompiler = new AsyncLocalStorage<typeof ts>();
const requireCompiler = createRequire(process.env.TSOA_COMPILER_ROOT ? resolve(process.env.TSOA_COMPILER_ROOT, 'package.json') : __filename);
let classic: typeof ts | undefined;
function classicCompiler(): typeof ts {
  return (classic ??= requireCompiler('typescript') as typeof ts);
}
export function compilerPackage(): 'typescript' | 'tsrs' {
  const name = process.env.TSOA_COMPILER ?? 'typescript';
  if (name !== 'typescript' && name !== 'tsrs') throw new Error(`Unknown TSOA_COMPILER "${name}". Use "typescript" or "tsrs".`);
  return name;
}
// While one compiler session is active, which is the usual case, it is the backend without asking the async context.
let activeSessions = 0;
let lastSession: typeof ts | undefined;
function backend(): typeof ts {
  if (activeSessions === 1 && lastSession) return lastSession;
  const active = activeCompiler.getStore();
  if (active) return active;
  if (compilerPackage() === 'typescript') {
    const installed = classicCompiler();
    if (typeof installed.createProgram === 'function') return installed;
  }
  throw new Error(`${compilerPackage()}: native compilers require an async generation entry point (generateSpec, generateRoutes or generateSpecAndRoutes).`);
}

// eslint-disable-next-line @typescript-eslint/no-implied-eval -- Preserve native ESM import when TypeScript emits CommonJS.
const importModule = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;
function resolveCompilerPart(name: string, part: string, typescript70: boolean): string {
  return requireCompiler.resolve(`${name}/${typescript70 ? 'unstable/' : ''}${part}`);
}
export async function withCompiler<T>(generate: () => T | Promise<T>): Promise<T> {
  if (activeCompiler.getStore()) return generate();
  const name = compilerPackage();
  if (name === 'typescript') {
    const installed = classicCompiler();
    if (typeof installed.createProgram === 'function') return generate();
  }
  const typescript70 = name === 'typescript' && classicCompiler().version.startsWith('7.0.');
  const [sync, ast] = await Promise.all(['sync', 'ast'].map(part => importModule(pathToFileURL(resolveCompilerPart(name, part, typescript70)).href)));
  const compiler = nativeCompiler(sync as NativeSync, ast as NativeAST, name, typescript70);
  activeSessions++;
  lastSession = compiler.surface;
  try {
    return await activeCompiler.run(compiler.surface, generate);
  } finally {
    activeSessions--;
    compiler.close();
  }
}

function namespace<T extends object>(select: () => T): T {
  return new Proxy({} as T, {
    get: (_target, key) => Reflect.get(select(), key),
    ownKeys: () => Reflect.ownKeys(select()),
    getOwnPropertyDescriptor: (_target, key) => ({ ...Reflect.getOwnPropertyDescriptor(select(), key), configurable: true }),
  });
}

export type ElementFlags = ts.ElementFlags;
export const ElementFlags = namespace(() => backend().ElementFlags);
export type IndexKind = ts.IndexKind;
export const IndexKind = namespace(() => backend().IndexKind);
export type ObjectFlags = ts.ObjectFlags;
export const ObjectFlags = namespace(() => backend().ObjectFlags);
export type SignatureKind = ts.SignatureKind;
export const SignatureKind = namespace(() => backend().SignatureKind);
export type NodeBuilderFlags = ts.NodeBuilderFlags;
export const NodeBuilderFlags = namespace(() => backend().NodeBuilderFlags);
export type NodeFlags = ts.NodeFlags;
export const NodeFlags = namespace(() => backend().NodeFlags);
export type SymbolFlags = ts.SymbolFlags;
export const SymbolFlags = namespace(() => backend().SymbolFlags);
export type SyntaxKind = ts.SyntaxKind;
export const SyntaxKind = namespace(() => backend().SyntaxKind);
export type TypeFlags = ts.TypeFlags;
export const TypeFlags = namespace(() => backend().TypeFlags);
export const sys = namespace(() => backend().sys);

function lazy<K extends keyof typeof ts>(key: K): (typeof ts)[K] {
  return ((...args: unknown[]) => (backend()[key] as (...args: unknown[]) => unknown)(...args)) as (typeof ts)[K];
}

export const canHaveDecorators = lazy('canHaveDecorators');
export const createProgram = lazy('createProgram');
export const displayPartsToString = lazy('displayPartsToString');
export const findConfigFile = lazy('findConfigFile');
export const forEachChild = lazy('forEachChild');
export const formatDiagnostics = lazy('formatDiagnostics');
export const getDecorators = lazy('getDecorators');
export const getModifiers = lazy('getModifiers');
export const getParsedCommandLineOfConfigFile = lazy('getParsedCommandLineOfConfigFile');
export const isArrayTypeNode = lazy('isArrayTypeNode');
export const isBlock = lazy('isBlock');
export const isCallExpression = lazy('isCallExpression');
export const isClassDeclaration = lazy('isClassDeclaration');
export const isComputedPropertyName = lazy('isComputedPropertyName');
export const isConditionalTypeNode = lazy('isConditionalTypeNode');
export const isConstructorDeclaration = lazy('isConstructorDeclaration');
export const isEnumDeclaration = lazy('isEnumDeclaration');
export const isEnumMember = lazy('isEnumMember');
export const isExpressionWithTypeArguments = lazy('isExpressionWithTypeArguments');
export const isIdentifier = lazy('isIdentifier');
export const isImportSpecifier = lazy('isImportSpecifier');
export const isIndexSignatureDeclaration = lazy('isIndexSignatureDeclaration');
export const isIndexedAccessTypeNode = lazy('isIndexedAccessTypeNode');
export const isInferTypeNode = lazy('isInferTypeNode');
export const isInterfaceDeclaration = lazy('isInterfaceDeclaration');
export const isIntersectionTypeNode = lazy('isIntersectionTypeNode');
export const isJSDocParameterTag = lazy('isJSDocParameterTag');
export const isJSDocReturnTag = lazy('isJSDocReturnTag');
export const isLiteralTypeNode = lazy('isLiteralTypeNode');
export const isMappedTypeNode = lazy('isMappedTypeNode');
export const isMethodDeclaration = lazy('isMethodDeclaration');
export const isMethodSignature = lazy('isMethodSignature');
export const isModuleBlock = lazy('isModuleBlock');
export const isModuleDeclaration = lazy('isModuleDeclaration');
export const isNamedTupleMember = lazy('isNamedTupleMember');
export const isNumericLiteral = lazy('isNumericLiteral');
export const isOptionalTypeNode = lazy('isOptionalTypeNode');
export const isObjectLiteralExpression = lazy('isObjectLiteralExpression');
export const isParameter = lazy('isParameter');
export const isParenthesizedTypeNode = lazy('isParenthesizedTypeNode');
export const isPropertyAccessExpression = lazy('isPropertyAccessExpression');
export const isPropertyDeclaration = lazy('isPropertyDeclaration');
export const isPropertySignature = lazy('isPropertySignature');
export const isQualifiedName = lazy('isQualifiedName');
export const isRestTypeNode = lazy('isRestTypeNode');
export const isSourceFile = lazy('isSourceFile');
export const isSpreadAssignment = lazy('isSpreadAssignment');
export const isSpreadElement = lazy('isSpreadElement');
export const isStringLiteral = lazy('isStringLiteral');
export const isTemplateLiteralTypeNode = lazy('isTemplateLiteralTypeNode');
export const isThisTypeNode = lazy('isThisTypeNode');
export const isTupleTypeNode = lazy('isTupleTypeNode');
export const isTypeAliasDeclaration = lazy('isTypeAliasDeclaration');
export const isTypeLiteralNode = lazy('isTypeLiteralNode');
export const isTypeOperatorNode = lazy('isTypeOperatorNode');
export const isTypeQueryNode = lazy('isTypeQueryNode');
export const isTypeReferenceNode = lazy('isTypeReferenceNode');
export const isUnionTypeNode = lazy('isUnionTypeNode');

export function firstToken(node: ts.Node): ts.Node | undefined {
  if (!node || node.pos === -1 || typeof node.getSourceFile()?.text !== 'string') return undefined;
  return node.getFirstToken
    ? node.getFirstToken()
    : (backend() as unknown as { getTokenAtPosition(file: ts.SourceFile, start: number): ts.Node }).getTokenAtPosition(node.getSourceFile(), node.getStart());
}

let classicPrinter: { printer: ts.Printer; emptySource: ts.SourceFile } | undefined;
/** The text of a node without comments, printed so that synthesized nodes have one too. */
export function printNode(node: ts.Node): string {
  const compiler = backend() as typeof ts & { printNode?: (node: ts.Node) => string };
  if (compiler.printNode) return compiler.printNode(node);
  classicPrinter ??= { printer: compiler.createPrinter({ removeComments: true }), emptySource: compiler.createSourceFile('printed.ts', '', compiler.ScriptTarget.Latest) };
  return classicPrinter.printer.printNode(compiler.EmitHint.Unspecified, node, node.pos !== -1 ? node.getSourceFile() : classicPrinter.emptySource);
}
