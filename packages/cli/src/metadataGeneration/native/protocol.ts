/**
 * The wire shape of the tsoa facts protocol (revision 6), spoken between tsoa and a native compiler helper
 * (tsgo or tsrs). Each message is a 4-byte little-endian length followed by UTF-8 JSON.
 */

export type TypeId = number & { readonly __brand: 'TypeId' };
export type SymbolId = number & { readonly __brand: 'SymbolId' };
export type FileId = number & { readonly __brand: 'FileId' };

/** A node by position: `pos` is the full start (leading trivia included), `kind` is the TypeScript 6 SyntaxKind name. */
export interface NodeRef {
  file: FileId;
  pos: number;
  end: number;
  kind: string;
}

export interface FileInfo {
  id: FileId;
  fileName: string;
  isDeclarationFile: boolean;
  isDefaultLibrary: boolean;
}

/** Flags cross as lists of single-bit enum member names. */
export interface TypeFacts {
  id: TypeId;
  flags: string[];
  objectFlags: string[];
  intrinsicName?: string;
  value?: string | number | { negative: boolean; base10Value: string };
  symbol?: SymbolId;
  aliasSymbol?: SymbolId;
  aliasTypeArguments?: TypeId[];
  typeArguments?: TypeId[];
  types?: TypeId[];
  origin?: TypeId;
  target?: TypeId;
  elementFlags?: string[][];
  isArray: boolean;
  isTuple: boolean;
  baseLiteral?: TypeId;
}

export interface SymbolFacts {
  id: SymbolId;
  name: string;
  escapedName: string;
  flags: string[];
  declarations: NodeRef[];
  valueDeclaration?: NodeRef;
  parent?: SymbolId;
  aliased?: SymbolId;
  syntheticOrigin?: SymbolId;
}

export interface IndexInfo {
  keyType: TypeId;
  type: TypeId;
  isReadonly: boolean;
}

/** One `prefetchFile` answer for the node at `pos`, `end` and `kind`. */
export type Entry<Id> = [pos: number, end: number, kind: string, id: Id];

export interface PrefetchResult {
  symbolAt: Array<Entry<SymbolId | null>>;
  typeFrom: Array<Entry<TypeId>>;
  declared: Array<Entry<SymbolId | null>>;
  typeOfSymbol: Array<[SymbolId, TypeId]>;
}

export interface Members {
  properties: Array<[SymbolId, TypeId]>;
  indexInfos: IndexInfo[];
}

export interface OpenResult {
  files: FileInfo[];
  undefinedType: TypeId;
}

export interface PrintResult {
  text: string;
  identifiers: Array<SymbolId | null>;
}

/** Every operation's input and result, keyed by op name. */
export interface Operations {
  open: { input: { cwd: string; rootFiles: string[]; compilerOptions: Record<string, unknown> }; result: OpenResult };
  fileText: { input: { file: FileId }; result: string };
  prefetchFile: { input: { file: FileId }; result: PrefetchResult };
  typeAtLocation: { input: { node: NodeRef }; result: TypeId };
  typeFromTypeNode: { input: { node: NodeRef }; result: TypeId };
  symbolAtLocation: { input: { node: NodeRef }; result: SymbolId | null };
  symbolOfDeclaration: { input: { node: NodeRef }; result: SymbolId | null };
  returnTypeOfDeclaration: { input: { node: NodeRef }; result: TypeId | null };
  constantValue: { input: { node: NodeRef }; result: string | number | null };
  resolveName: { input: { name: string; node: NodeRef; meaning: string[] }; result: SymbolId | null };
  type: { input: { type: TypeId }; result: TypeFacts };
  symbol: { input: { symbol: SymbolId }; result: SymbolFacts };
  typeOfSymbol: { input: { symbol: SymbolId }; result: TypeId };
  exportOf: { input: { symbol: SymbolId; name: string }; result: SymbolId | null };
  members: { input: { type: TypeId }; result: Members };
  properties: { input: { type: TypeId }; result: SymbolId[] };
  property: { input: { type: TypeId; name: string }; result: SymbolId | null };
  indexInfos: { input: { type: TypeId }; result: IndexInfo[] };
  callSignatures: { input: { type: TypeId }; result: Array<{ returnType: TypeId }> };
  nonNullable: { input: { type: TypeId }; result: TypeId };
  union: { input: { types: TypeId[] }; result: TypeId };
  assignable: { input: { source: TypeId; target: TypeId }; result: boolean };
  typeToString: { input: { type: TypeId }; result: string };
  print: { input: { type: TypeId }; result: PrintResult | null };
  close: { input: object; result: null };
}

export type Op = keyof Operations;
export type Query<O extends Op = Op> = { [K in O]: { op: K } & Operations[K]['input'] }[O];
export type Answer<O extends Op> = Operations[O]['result'];

/** A batch answers with one Response per query, in order. */
export type Request = Query | { op: 'batch'; queries: Query[] };

/** Facts of ids this response handed to Node for the first time (revision 4a). Keys are ids as JSON strings. */
export interface InlineFacts {
  types?: Record<string, TypeFacts>;
  symbols?: Record<string, SymbolFacts>;
}

export type Response = { ok: true; result: unknown; facts?: InlineFacts } | { ok: false; error: string };
