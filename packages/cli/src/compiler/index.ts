import type * as ts from 'typescript';
import { AsyncLocalStorage } from 'node:async_hooks';
import { pathToFileURL } from 'node:url';
import { nativeCompiler } from './native';

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
  HasInitializer,
  HasModifiers,
  HasType,
  Identifier,
  ImportSpecifier,
  IndexSignatureDeclaration,
  IndexedAccessTypeNode,
  InterfaceDeclaration,
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
  ParameterDeclaration,
  PrefixUnaryExpression,
  Program,
  PropertyDeclaration,
  PropertySignature,
  PseudoBigInt,
  StringLiteral,
  StringLiteralType,
  Symbol,
  Token,
  Type,
  TypeAliasDeclaration,
  TypeChecker,
  TypeElement,
  TypeNode,
  TypeOperatorNode,
  TypeReference,
  TypeReferenceNode,
  TypeReferenceType,
  UnionType,
} from 'typescript';

const activeCompiler = new AsyncLocalStorage<typeof ts>();
let classic: typeof ts | undefined;
export function compilerPackage(): 'typescript' | 'tsrs' {
  const name = process.env.TSOA_COMPILER ?? 'typescript';
  if (name !== 'typescript' && name !== 'tsrs') throw new Error(`Unknown TSOA_COMPILER "${name}". Use "typescript" or "tsrs".`);
  return name;
}
function backend(): typeof ts {
  const active = activeCompiler.getStore();
  if (active) return active;
  if (compilerPackage() === 'typescript') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    classic ??= require('typescript') as typeof ts;
    if (typeof classic.createProgram === 'function') return classic;
  }
  throw new Error(`${compilerPackage()}: native compilers require an async generation entry point (generateSpec, generateRoutes or generateSpecAndRoutes).`);
}

// Preserve import() when compiling the CLI to CommonJS.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const importModule = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;
export async function withCompiler<T>(generate: () => T | Promise<T>): Promise<T> {
  if (activeCompiler.getStore()) return generate();
  const name = compilerPackage();
  if (name === 'typescript') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const installed = require('typescript') as typeof ts;
    if (typeof installed.createProgram === 'function') return generate();
  }
  const [sync, ast] = await Promise.all(['sync', 'ast'].map(part => importModule(pathToFileURL(require.resolve(`${name}/unstable/${part}`)).href)));
  const compiler = nativeCompiler(sync, ast, name);
  try {
    return await activeCompiler.run(compiler.surface, generate);
  } finally {
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

export const canHaveDecorators = ((...args: any[]) => (backend().canHaveDecorators as (...args: any[]) => any)(...args)) as typeof ts.canHaveDecorators;
export const createProgram = ((...args: any[]) => (backend().createProgram as (...args: any[]) => any)(...args)) as typeof ts.createProgram;
export const displayPartsToString = ((...args: any[]) => (backend().displayPartsToString as (...args: any[]) => any)(...args)) as typeof ts.displayPartsToString;
export const findConfigFile = ((...args: any[]) => (backend().findConfigFile as (...args: any[]) => any)(...args)) as typeof ts.findConfigFile;
export const forEachChild = ((...args: any[]) => (backend().forEachChild as (...args: any[]) => any)(...args)) as typeof ts.forEachChild;
export const formatDiagnostics = ((...args: any[]) => (backend().formatDiagnostics as (...args: any[]) => any)(...args)) as typeof ts.formatDiagnostics;
export const getDecorators = ((...args: any[]) => (backend().getDecorators as (...args: any[]) => any)(...args)) as typeof ts.getDecorators;
export const getModifiers = ((...args: any[]) => (backend().getModifiers as (...args: any[]) => any)(...args)) as typeof ts.getModifiers;
export const getParsedCommandLineOfConfigFile = ((...args: any[]) => (backend().getParsedCommandLineOfConfigFile as (...args: any[]) => any)(...args)) as typeof ts.getParsedCommandLineOfConfigFile;
export const isArrayTypeNode = ((...args: any[]) => (backend().isArrayTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isArrayTypeNode;
export const isBlock = ((...args: any[]) => (backend().isBlock as (...args: any[]) => any)(...args)) as typeof ts.isBlock;
export const isCallExpression = ((...args: any[]) => (backend().isCallExpression as (...args: any[]) => any)(...args)) as typeof ts.isCallExpression;
export const isClassDeclaration = ((...args: any[]) => (backend().isClassDeclaration as (...args: any[]) => any)(...args)) as typeof ts.isClassDeclaration;
export const isComputedPropertyName = ((...args: any[]) => (backend().isComputedPropertyName as (...args: any[]) => any)(...args)) as typeof ts.isComputedPropertyName;
export const isConditionalTypeNode = ((...args: any[]) => (backend().isConditionalTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isConditionalTypeNode;
export const isConstructorDeclaration = ((...args: any[]) => (backend().isConstructorDeclaration as (...args: any[]) => any)(...args)) as typeof ts.isConstructorDeclaration;
export const isEnumDeclaration = ((...args: any[]) => (backend().isEnumDeclaration as (...args: any[]) => any)(...args)) as typeof ts.isEnumDeclaration;
export const isEnumMember = ((...args: any[]) => (backend().isEnumMember as (...args: any[]) => any)(...args)) as typeof ts.isEnumMember;
export const isExpressionWithTypeArguments = ((...args: any[]) => (backend().isExpressionWithTypeArguments as (...args: any[]) => any)(...args)) as typeof ts.isExpressionWithTypeArguments;
export const isIdentifier = ((...args: any[]) => (backend().isIdentifier as (...args: any[]) => any)(...args)) as typeof ts.isIdentifier;
export const isImportSpecifier = ((...args: any[]) => (backend().isImportSpecifier as (...args: any[]) => any)(...args)) as typeof ts.isImportSpecifier;
export const isIndexSignatureDeclaration = ((...args: any[]) => (backend().isIndexSignatureDeclaration as (...args: any[]) => any)(...args)) as typeof ts.isIndexSignatureDeclaration;
export const isIndexedAccessTypeNode = ((...args: any[]) => (backend().isIndexedAccessTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isIndexedAccessTypeNode;
export const isInterfaceDeclaration = ((...args: any[]) => (backend().isInterfaceDeclaration as (...args: any[]) => any)(...args)) as typeof ts.isInterfaceDeclaration;
export const isIntersectionTypeNode = ((...args: any[]) => (backend().isIntersectionTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isIntersectionTypeNode;
export const isJSDocParameterTag = ((...args: any[]) => (backend().isJSDocParameterTag as (...args: any[]) => any)(...args)) as typeof ts.isJSDocParameterTag;
export const isJSDocReturnTag = ((...args: any[]) => (backend().isJSDocReturnTag as (...args: any[]) => any)(...args)) as typeof ts.isJSDocReturnTag;
export const isLiteralTypeNode = ((...args: any[]) => (backend().isLiteralTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isLiteralTypeNode;
export const isMappedTypeNode = ((...args: any[]) => (backend().isMappedTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isMappedTypeNode;
export const isMethodDeclaration = ((...args: any[]) => (backend().isMethodDeclaration as (...args: any[]) => any)(...args)) as typeof ts.isMethodDeclaration;
export const isMethodSignature = ((...args: any[]) => (backend().isMethodSignature as (...args: any[]) => any)(...args)) as typeof ts.isMethodSignature;
export const isModuleBlock = ((...args: any[]) => (backend().isModuleBlock as (...args: any[]) => any)(...args)) as typeof ts.isModuleBlock;
export const isModuleDeclaration = ((...args: any[]) => (backend().isModuleDeclaration as (...args: any[]) => any)(...args)) as typeof ts.isModuleDeclaration;
export const isNamedTupleMember = ((...args: any[]) => (backend().isNamedTupleMember as (...args: any[]) => any)(...args)) as typeof ts.isNamedTupleMember;
export const isNumericLiteral = ((...args: any[]) => (backend().isNumericLiteral as (...args: any[]) => any)(...args)) as typeof ts.isNumericLiteral;
export const isObjectLiteralExpression = ((...args: any[]) => (backend().isObjectLiteralExpression as (...args: any[]) => any)(...args)) as typeof ts.isObjectLiteralExpression;
export const isParameter = ((...args: any[]) => (backend().isParameter as (...args: any[]) => any)(...args)) as typeof ts.isParameter;
export const isParenthesizedTypeNode = ((...args: any[]) => (backend().isParenthesizedTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isParenthesizedTypeNode;
export const isPropertyAccessExpression = ((...args: any[]) => (backend().isPropertyAccessExpression as (...args: any[]) => any)(...args)) as typeof ts.isPropertyAccessExpression;
export const isPropertyDeclaration = ((...args: any[]) => (backend().isPropertyDeclaration as (...args: any[]) => any)(...args)) as typeof ts.isPropertyDeclaration;
export const isPropertySignature = ((...args: any[]) => (backend().isPropertySignature as (...args: any[]) => any)(...args)) as typeof ts.isPropertySignature;
export const isRestTypeNode = ((...args: any[]) => (backend().isRestTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isRestTypeNode;
export const isSourceFile = ((...args: any[]) => (backend().isSourceFile as (...args: any[]) => any)(...args)) as typeof ts.isSourceFile;
export const isSpreadAssignment = ((...args: any[]) => (backend().isSpreadAssignment as (...args: any[]) => any)(...args)) as typeof ts.isSpreadAssignment;
export const isSpreadElement = ((...args: any[]) => (backend().isSpreadElement as (...args: any[]) => any)(...args)) as typeof ts.isSpreadElement;
export const isStringLiteral = ((...args: any[]) => (backend().isStringLiteral as (...args: any[]) => any)(...args)) as typeof ts.isStringLiteral;
export const isTemplateLiteralTypeNode = ((...args: any[]) => (backend().isTemplateLiteralTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isTemplateLiteralTypeNode;
export const isTupleTypeNode = ((...args: any[]) => (backend().isTupleTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isTupleTypeNode;
export const isTypeAliasDeclaration = ((...args: any[]) => (backend().isTypeAliasDeclaration as (...args: any[]) => any)(...args)) as typeof ts.isTypeAliasDeclaration;
export const isTypeLiteralNode = ((...args: any[]) => (backend().isTypeLiteralNode as (...args: any[]) => any)(...args)) as typeof ts.isTypeLiteralNode;
export const isTypeOperatorNode = ((...args: any[]) => (backend().isTypeOperatorNode as (...args: any[]) => any)(...args)) as typeof ts.isTypeOperatorNode;
export const isTypeQueryNode = ((...args: any[]) => (backend().isTypeQueryNode as (...args: any[]) => any)(...args)) as typeof ts.isTypeQueryNode;
export const isTypeReferenceNode = ((...args: any[]) => (backend().isTypeReferenceNode as (...args: any[]) => any)(...args)) as typeof ts.isTypeReferenceNode;
export const isUnionTypeNode = ((...args: any[]) => (backend().isUnionTypeNode as (...args: any[]) => any)(...args)) as typeof ts.isUnionTypeNode;

export function firstToken(node: ts.Node): ts.Node | undefined {
  if (!node) return undefined;
  if (node.pos === -1) {
    try {
      void node.getSourceFile()?.fileName;
    } catch {
      throw new Error(`Synthetic node source locations are not supported with the ${compilerPackage()} compiler backend.`);
    }
    return undefined;
  }
  return node.getFirstToken
    ? node.getFirstToken()
    : (backend() as unknown as { getTokenAtPosition(file: ts.SourceFile, start: number): ts.Node }).getTokenAtPosition(node.getSourceFile(), node.getStart());
}

export function printNode(node: ts.Node): string {
  const compiler = backend() as typeof ts & { printNode?: (node: ts.Node) => string };
  return compiler.printNode ? compiler.printNode(node) : compiler.createPrinter().printNode(compiler.EmitHint.Unspecified, node, compiler.createSourceFile('', '', compiler.ScriptTarget.Latest));
}
