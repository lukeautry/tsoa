// Single entry point to the TypeScript 7 API: `typescript/ast` for syntax, `typescript/sync` for the program and checker.
import { all, API, type Symbol } from 'typescript/sync';
import { getTextOfJSDocComment, isDecorator, SyntaxKind, type Declaration, type Decorator, type JSDocComment, type Modifier, type Node, type NodeArray } from 'typescript/ast';

export * from 'typescript/ast';
export {
  all,
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

/**
 * A step of work that may wait on the compiler. Compiler calls are written as `yield* checker.method.gen(...)`.
 * Steps run together by `run` or `all` send their pending compiler calls in one round trip, so the number of round
 * trips follows the longest chain of dependent calls rather than the number of calls.
 */
export type Op<T> = Generator<any, T, any>;

/** Runs a step to completion, sending its compiler calls in as few round trips as its dependencies allow. */
export function run<T>(op: Op<T>): T {
  return getApi().batch(op)[0];
}

/** Runs one step per item together and collects their results in order. */
export function* map<T, R>(items: readonly T[], step: (item: T, index: number) => Op<R>): Op<R[]> {
  if (!items.length) {
    return [];
  }
  return yield* all(...items.map(step));
}

/** Lets the other running steps advance by one round without sending a compiler call. */
export function* nextRound(): Op<void> {
  yield [];
}

interface Memo<V> {
  done: boolean;
  value?: V;
}

/** A cache of compiler results, keyed by objects of one program. */
export type MemoCache<K extends object, V> = WeakMap<K, Memo<V>>;

/**
 * The cached result of `compute` for `key`. Steps that ask for a key that is still being computed wait for it,
 * so a result is computed once even when steps that run together ask for it.
 */
export function* memo<K extends object, V>(cache: MemoCache<K, V>, key: K, compute: () => Op<V>): Op<V> {
  const entry = cache.get(key);
  if (entry) {
    while (!entry.done) {
      if (cache.get(key) !== entry) {
        // The computation failed; compute it here.
        return yield* memo(cache, key, compute);
      }
      yield* nextRound();
    }
    return entry.value as V;
  }
  const pending: Memo<V> = { done: false };
  cache.set(key, pending);
  try {
    pending.value = yield* compute();
    pending.done = true;
    return pending.value;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}

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
export function* nodeText(node: Node): Op<string> {
  return isSynthetic(node) ? yield* getApi().printer.printNode.gen(node) : node.getText();
}

/** The declarations of a symbol as AST nodes. */
export function* getDeclarations(symbol: Symbol): Op<Declaration[]> {
  const declarations = yield* map(symbol.declarations, handle => handle.resolve.gen());
  return declarations.filter((declaration): declaration is Declaration => declaration !== undefined);
}

export function* getValueDeclaration(symbol: Symbol): Op<Declaration | undefined> {
  return symbol.valueDeclaration ? yield* symbol.valueDeclaration.resolve.gen() : undefined;
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
