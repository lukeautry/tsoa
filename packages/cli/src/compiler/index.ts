import type * as ts from 'typescript';

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

let classic: typeof ts | undefined;
function backend(): typeof ts {
  // Keep loading lazy: TypeScript 7 has no classic compiler API.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  classic ??= require('typescript') as typeof ts;
  if (!classic.createProgram) throw new Error('This compiler requires the async metadata generation entry point.');
  return classic;
}

function namespace<T extends object>(select: () => T): T {
  return new Proxy({} as T, {
    get: (_target, key) => Reflect.get(select(), key),
    ownKeys: () => Reflect.ownKeys(select()),
    getOwnPropertyDescriptor: (_target, key) => ({ ...Reflect.getOwnPropertyDescriptor(select(), key), configurable: true }),
  });
}

export type EmitHint = ts.EmitHint;
export const EmitHint = namespace(() => backend().EmitHint);
export type NodeBuilderFlags = ts.NodeBuilderFlags;
export const NodeBuilderFlags = namespace(() => backend().NodeBuilderFlags);
export type NodeFlags = ts.NodeFlags;
export const NodeFlags = namespace(() => backend().NodeFlags);
export type ScriptTarget = ts.ScriptTarget;
export const ScriptTarget = namespace(() => backend().ScriptTarget);
export type SymbolFlags = ts.SymbolFlags;
export const SymbolFlags = namespace(() => backend().SymbolFlags);
export type SyntaxKind = ts.SyntaxKind;
export const SyntaxKind = namespace(() => backend().SyntaxKind);
export type TypeFlags = ts.TypeFlags;
export const TypeFlags = namespace(() => backend().TypeFlags);
export const sys = namespace(() => backend().sys);

export const canHaveDecorators = ((...args: any[]) => (backend().canHaveDecorators as (...args: any[]) => any)(...args)) as typeof ts.canHaveDecorators;
export const createPrinter = ((...args: any[]) => (backend().createPrinter as (...args: any[]) => any)(...args)) as typeof ts.createPrinter;
export const createProgram = ((...args: any[]) => (backend().createProgram as (...args: any[]) => any)(...args)) as typeof ts.createProgram;
export const createSourceFile = ((...args: any[]) => (backend().createSourceFile as (...args: any[]) => any)(...args)) as typeof ts.createSourceFile;
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
