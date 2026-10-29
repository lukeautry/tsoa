// Single entry point to the TypeScript 7 API: `typescript/ast` for syntax, `typescript/sync` for the program and checker.
import { API, type Symbol } from 'typescript/sync';
import { getTextOfJSDocComment, isDecorator, SyntaxKind, type Declaration, type Decorator, type JSDocComment, type Modifier, type Node, type NodeArray } from 'typescript/ast';

export * from 'typescript/ast';
export {
  API,
  Checker,
  Program,
  Symbol,
  Signature,
  NodeHandle,
  NodeBuilderFlags,
  ObjectFlags,
  SignatureKind,
  SymbolFlags,
  TypeFlags,
  TypeFormatFlags,
  ElementFlags,
  DiagnosticCategory,
  ModuleKind,
  ModuleResolutionKind,
  formatDiagnostics,
} from 'typescript/sync';
export type {
  CompilerOptions,
  Diagnostic,
  IndexInfo,
  IntersectionType,
  LiteralType,
  NumberLiteralType,
  ObjectType,
  ParsedCommandLine,
  RawCompilerOptions,
  StringLiteralType,
  TupleTypeReference,
  Type,
  TypeReference,
  UnionOrIntersectionType,
  UnionType,
} from 'typescript/sync';

let sharedApi: API | undefined;

/** The compiler process shared by every program tsoa creates. It starts on first use. */
export function getApi(): API {
  return (sharedApi ??= new API({ cwd: process.cwd() }));
}

/**
 * Whether a node was printed by the checker (`typeToTypeNode`) rather than parsed from a source file.
 * Printed nodes are unknown to the checker. The printer may copy source nodes into its output: those keep their
 * position but belong to the printed tree, whose source file has no position.
 */
export const isSynthetic = (node: Node) => node.pos === -1 || node.getSourceFile().pos === -1;

/** The source text of a node, or its printed form for a node printed by the checker. */
export function nodeText(node: Node): string {
  return isSynthetic(node) ? getApi().printer.printNode(node) : node.getText();
}

/** The declarations of a symbol as AST nodes. */
export function getDeclarations(symbol: Symbol): Declaration[] {
  return symbol.declarations.flatMap(handle => handle.resolve() ?? []);
}

export function getValueDeclaration(symbol: Symbol): Declaration | undefined {
  return symbol.valueDeclaration?.resolve();
}

/** Whether a property, property signature or parameter is optional (`name?`). */
export function hasQuestionToken(node: Node): boolean {
  const token = (node as { postfixToken?: Node; questionToken?: Node }).postfixToken ?? (node as { questionToken?: Node }).questionToken;
  return token?.kind === SyntaxKind.QuestionToken;
}

export function getModifiers(node: Node): readonly Modifier[] {
  const modifiers = (node as { modifiers?: NodeArray<Modifier | Decorator> }).modifiers;
  return modifiers ? modifiers.filter((modifier): modifier is Modifier => !isDecorator(modifier)) : [];
}

export function getDecorators(node: Node): readonly Decorator[] {
  const modifiers = (node as { modifiers?: NodeArray<Modifier | Decorator> }).modifiers;
  return modifiers ? modifiers.filter(isDecorator) : [];
}

/** The text of a JSDoc comment, with links flattened to their text. */
export function jsDocCommentText(comment: string | NodeArray<JSDocComment> | undefined): string | undefined {
  return getTextOfJSDocComment(comment);
}
