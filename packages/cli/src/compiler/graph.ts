/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
// Prototype: answers checker queries from one `tsoa/describe` response of the compiler with tsoa's API
// extensions (packages/cli/native-api) instead of a request each.
//
// The response describes the program's own files as plain data: the symbol of every name, the type of every type
// node, and every type and symbol reachable from them. Its types and symbols become plain objects here; what they
// do not describe, and every other checker query, goes to the API as before. Results of the API are mapped back
// to the described objects by id, so the resolver meets one object per type and symbol.

interface DescribedType {
  r: { id: number; flags: number; objectFlags?: number; value?: unknown };
  symbol?: number;
  alias?: number;
  aliasArgs?: number[];
  types?: number[];
  args?: number[];
  array?: boolean;
  tuple?: boolean;
  props: number[] | null;
  index?: Array<{ key: number; value: number; readonly?: boolean }>;
  intrinsic?: string;
}
/** A node as [file, index, kind]; files are indexes into the file table, plus one. */
type NodeReference = [number, number, number];
interface DescribedSymbol {
  id: number;
  owner?: number;
  project?: string;
  name: string;
  flags: number;
  checkFlags?: number;
  parent?: unknown;
  export?: unknown;
  decls?: NodeReference[];
  value?: NodeReference;
  doc?: string;
  type?: number;
  aliased?: number;
}
interface DescribedNodes {
  file: number;
  symbols?: number[];
  types?: number[];
  locations?: number[];
  returns?: number[];
  constants?: Array<number | string>;
}
export interface Description {
  snapshot: unknown;
  files: Array<{ path: string; descriptor?: unknown }>;
  types: DescribedType[];
  symbols: DescribedSymbol[];
  nodes: DescribedNodes[];
}

/** The answers for the nodes of one file, by node index. */
interface NodeAnswers {
  symbols: Map<number, number>;
  types: Map<number, number>;
  locations: Map<number, number>;
  returns: Map<number, number>;
  constants: Map<number, number | string>;
}
const pairs = <T>(list: T[] | undefined): Map<number, T> => {
  const map = new Map<number, T>();
  if (list) for (let index = 0; index < list.length; index += 2) map.set(list[index] as number, list[index + 1]);
  return map;
};

/** What the graph needs of the classic checker adapter (native.ts). */
export interface ClassicSide {
  checker: any;
  /** The API's own object for a type or symbol of the response, as the adapter presents it. */
  classicType(raw: DescribedType['r']): any;
  classicSymbol(response: unknown): any;
  /** A file of the program, fetched once. */
  sourceFile(path: string): any;
  /** The API's object behind an object the adapter presents, if it is a type or symbol. */
  native(value: any): any;
  typeFlags: { BooleanLiteral: number; Union: number; Intersection: number; StringLiteral: number; NumberLiteral: number; BigIntLiteral: number; String: number; Number: number };
}

class Graph {
  readonly types: GraphType[];
  readonly symbols: GraphSymbol[];
  private readonly typesById = new Map<number, GraphType>();
  private readonly symbolsById = new Map<number, GraphSymbol>();
  private readonly answers = new Map<string, NodeAnswers>();
  private readonly sourceFiles = new Map<string, any>();
  // A node's file answers and index, parsed from its handle once: the client returns one object per node.
  private readonly located = new WeakMap<object, { answers: NodeAnswers | undefined; index: number }>();
  undefinedType: unknown;

  constructor(
    readonly description: Description,
    readonly classic: ClassicSide,
  ) {
    this.types = description.types.map(described => new GraphType(this, described));
    this.symbols = description.symbols.map(described => new GraphSymbol(this, described));
    for (const type of this.types) this.typesById.set(type.described.r.id, type);
    for (const symbol of this.symbols) this.symbolsById.set(symbol.described.id, symbol);
    for (const nodes of description.nodes) {
      this.answers.set(description.files[nodes.file - 1].path, {
        symbols: pairs(nodes.symbols),
        types: pairs(nodes.types),
        locations: pairs(nodes.locations),
        returns: pairs(nodes.returns),
        constants: pairs(nodes.constants),
      });
    }
  }

  /** The described answer for a node, by its handle `index.kind.path`. */
  answer(node: any, kind: keyof NodeAnswers): number | string | undefined {
    if (!node || typeof node !== 'object' || node.pos === -1) return undefined;
    let location = this.located.get(node);
    if (!location) {
      const id = node.id;
      if (typeof id !== 'string') return undefined;
      const first = id.indexOf('.');
      const second = id.indexOf('.', first + 1);
      location = { answers: this.answers.get(id.slice(second + 1)), index: Number(id.slice(0, first)) };
      this.located.set(node, location);
    }
    return location.answers?.[kind].get(location.index);
  }

  /** A node of the program by file and index, as the API's node handles resolve. */
  node([file, index]: NodeReference): unknown {
    const path = this.description.files[file - 1].path;
    let sourceFile = this.sourceFiles.get(path);
    if (!sourceFile) this.sourceFiles.set(path, (sourceFile = this.classic.sourceFile(path)));
    return sourceFile?.getOrCreateNodeAtIndex(index);
  }

  handle([file, index, kind]: NodeReference): string {
    return `${index}.${kind}.${this.description.files[file - 1].path}`;
  }

  type(reference: number | undefined): GraphType | undefined {
    return reference ? this.types[reference - 1] : undefined;
  }
  symbol(reference: number | undefined): GraphSymbol | undefined {
    return reference ? this.symbols[reference - 1] : undefined;
  }
  typeList(references: number[] | undefined): GraphType[] | undefined {
    return references?.map(reference => this.types[reference - 1]);
  }

  /** An argument for the adapter: described objects become the API's objects. */
  toClassic = (value: any): any => {
    if (value instanceof GraphType || value instanceof GraphSymbol || value instanceof GraphSignature) return value.classic();
    if (Array.isArray(value)) return value.map(this.toClassic);
    return value;
  };

  /** A result of the adapter: the API's types and symbols become their described objects, where there are any. */
  fromClassic = (value: any): any => {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(this.fromClassic);
    const native = this.classic.native(value);
    if (native && typeof native === 'object') {
      if (native.reference && typeof native.flags === 'number') return this.symbolsById.get(native.reference.id) ?? value;
      if (typeof native.id === 'number' && typeof native.flags === 'number') return this.typesById.get(native.id) ?? value;
    }
    // Index infos carry types.
    if ('keyType' in value && ('type' in value || 'valueType' in value)) {
      return { ...value, keyType: this.fromClassic(value.keyType), type: this.fromClassic(value.type ?? value.valueType) };
    }
    return value;
  };
}

// Properties a described object does not answer are those of the API's object, through a proxy on the
// prototype: a described property is a plain property, so only what the response lacks pays for the proxy.
const ownKeys = new Set(['graph', 'described', 'classic', 'classicObject', 'declarationList', 'declaration', 'returnType', 'flagsOverride']);
function delegatingPrototype(): object {
  return new Proxy(Object.create(null) as object, {
    get(_target, key, receiver: { graph: Graph; classic(): any }) {
      if (typeof key === 'symbol' || ownKeys.has(key)) return undefined;
      const classic = receiver.classic();
      const value = classic[key];
      if (typeof value !== 'function') return receiver.graph.fromClassic(value);
      return (...args: unknown[]) => receiver.graph.fromClassic(value.apply(classic, args.map(receiver.graph.toClassic)));
    },
  });
}

class GraphType {
  private classicObject: unknown = undefined;
  constructor(
    readonly graph: Graph,
    readonly described: DescribedType,
  ) {}
  classic(): any {
    return (this.classicObject ??= this.graph.classic.classicType(this.described.r));
  }
  get id() {
    return this.described.r.id;
  }
  get flags() {
    return this.described.r.flags;
  }
  get objectFlags() {
    return this.described.r.objectFlags ?? 0;
  }
  get value() {
    return this.described.r.value;
  }
  get intrinsicName() {
    // Boolean literals are not intrinsic types on the server; classic TypeScript names them by their value.
    if (this.flags & this.graph.classic.typeFlags.BooleanLiteral) return String(this.described.r.value);
    return this.described.intrinsic;
  }
  get symbol() {
    return this.graph.symbol(this.described.symbol);
  }
  get aliasSymbol() {
    return this.graph.symbol(this.described.alias);
  }
  get aliasTypeArguments() {
    return this.graph.typeList(this.described.aliasArgs);
  }
  get types() {
    return this.graph.typeList(this.described.types) ?? this.graph.fromClassic(this.classic().types);
  }
  getFlags() {
    return this.flags;
  }
  getSymbol() {
    return this.symbol;
  }
  isUnion() {
    return (this.flags & this.graph.classic.typeFlags.Union) !== 0;
  }
  isIntersection() {
    return (this.flags & this.graph.classic.typeFlags.Intersection) !== 0;
  }
  isUnionOrIntersection() {
    return this.isUnion() || this.isIntersection();
  }
  isLiteral() {
    const flags = this.graph.classic.typeFlags;
    return (this.flags & (flags.StringLiteral | flags.NumberLiteral | flags.BigIntLiteral)) !== 0;
  }
  isStringLiteral() {
    return (this.flags & this.graph.classic.typeFlags.StringLiteral) !== 0;
  }
  isNumberLiteral() {
    return (this.flags & this.graph.classic.typeFlags.NumberLiteral) !== 0;
  }
  getProperties() {
    return properties(this);
  }
  getProperty(name: string) {
    return property(this, name);
  }
  getStringIndexType() {
    return indexInfo(this, this.graph.classic.typeFlags.String)?.type;
  }
  getNumberIndexType() {
    return indexInfo(this, this.graph.classic.typeFlags.Number)?.type;
  }
}
Object.setPrototypeOf(GraphType.prototype, delegatingPrototype());

class GraphSymbol {
  private classicObject: unknown = undefined;
  private declarationList: unknown = undefined;
  constructor(
    readonly graph: Graph,
    readonly described: DescribedSymbol,
  ) {}
  /** The API's own symbol, from the response the described fields make up again. */
  classic(): any {
    if (this.classicObject) return this.classicObject;
    const { graph, described } = this;
    const reference = described.owner
      ? { kind: 0, id: described.id, file: graph.description.files[described.owner - 1].descriptor }
      : { kind: 1, id: described.id, snapshot: graph.description.snapshot, project: described.project };
    return (this.classicObject = graph.classic.classicSymbol({
      reference,
      name: described.name,
      flags: described.flags,
      checkFlags: described.checkFlags ?? 0,
      declarations: described.decls?.map(declaration => graph.handle(declaration)),
      valueDeclaration: described.value && graph.handle(described.value),
      parent: described.parent,
      exportSymbol: described.export,
    }));
  }
  get escapedName() {
    return this.described.name;
  }
  get name() {
    // As the API's own symbols unescape it.
    const name = this.described.name;
    return name.startsWith('___') ? name.slice(1) : name;
  }
  // #1923 resets a symbol's flags for a moment to read the documentation of a constructor parameter.
  private flagsOverride: number | undefined = undefined;
  get flags() {
    return this.flagsOverride ?? this.described.flags;
  }
  set flags(flags: number) {
    this.flagsOverride = flags;
  }
  get declarations() {
    return (this.declarationList ??= this.described.decls?.map(declaration => this.graph.node(declaration)));
  }
  get valueDeclaration() {
    return this.described.value && this.graph.node(this.described.value);
  }
  getName() {
    return this.name;
  }
  getEscapedName() {
    return this.escapedName;
  }
  getFlags() {
    return this.flags;
  }
  getDeclarations() {
    return this.declarations;
  }
  getDocumentationComment() {
    return this.described.doc ?? '';
  }
}
Object.setPrototypeOf(GraphSymbol.prototype, delegatingPrototype());

/** The signature of a declaration, which knows its return type and asks for the signature itself when needed. */
class GraphSignature {
  private classicObject: unknown = undefined;
  constructor(
    readonly graph: Graph,
    readonly declaration: unknown,
    readonly returnType: GraphType,
  ) {}
  classic(): any {
    return (this.classicObject ??= this.graph.classic.checker.getSignatureFromDeclaration(this.declaration));
  }
}
Object.setPrototypeOf(GraphSignature.prototype, delegatingPrototype());

function properties(type: GraphType): GraphSymbol[] | any[] {
  const props = type.described.props;
  if (props) return props.map(reference => type.graph.symbols[reference - 1]);
  return type.graph.fromClassic(type.graph.classic.checker.getPropertiesOfType(type.classic()));
}

function property(type: GraphType, name: string): unknown {
  // A described property list is complete: a name it lacks is not a property of the type.
  if (type.described.props) return (properties(type) as GraphSymbol[]).find(symbol => symbol.escapedName === name || symbol.name === name);
  return type.graph.fromClassic(type.graph.classic.checker.getPropertyOfType(type.classic(), name));
}

function indexInfos(type: GraphType): Array<{ keyType: unknown; type: unknown; isReadonly: boolean }> {
  if (type.described.props) {
    return (type.described.index ?? []).map(info => ({ keyType: type.graph.type(info.key), type: type.graph.type(info.value), isReadonly: !!info.readonly }));
  }
  return type.graph.fromClassic(type.graph.classic.checker.getIndexInfosOfType(type.classic()));
}

function indexInfo(type: GraphType, keyFlag: number) {
  return indexInfos(type).find(info => ((info.keyType as { flags?: number })?.flags ?? 0) & keyFlag);
}

/** A checker that answers from the description and asks the adapter for the rest. */
export function graphChecker(description: Description, classic: ClassicSide): unknown {
  const graph = new Graph(description, classic);
  const asked = <T>(fallback: () => T): T => graph.fromClassic(fallback());
  const handlers: Record<string, (...args: any[]) => unknown> = {
    getSymbolAtLocation: (node: any) => {
      const reference = graph.answer(node, 'symbols') as number | undefined;
      return reference ? graph.symbols[reference - 1] : asked(() => classic.checker.getSymbolAtLocation(node));
    },
    getTypeFromTypeNode: (node: any) => {
      const reference = graph.answer(node, 'types') as number | undefined;
      return reference ? graph.types[reference - 1] : asked(() => classic.checker.getTypeFromTypeNode(node));
    },
    getTypeAtLocation: (node: any) => {
      const reference = graph.answer(node, 'locations') as number | undefined;
      return reference ? graph.types[reference - 1] : asked(() => classic.checker.getTypeAtLocation(node));
    },
    getSignatureFromDeclaration: (node: any) => {
      const reference = graph.answer(node, 'returns') as number | undefined;
      return reference ? new GraphSignature(graph, node, graph.types[reference - 1]) : asked(() => classic.checker.getSignatureFromDeclaration(node));
    },
    getReturnTypeOfSignature: (signature: any) => (signature instanceof GraphSignature ? signature.returnType : asked(() => classic.checker.getReturnTypeOfSignature(graph.toClassic(signature)))),
    getConstantValue: (node: any) => graph.answer(node, 'constants') ?? asked(() => classic.checker.getConstantValue(node)),
    getTypeOfSymbol: (symbol: any) =>
      symbol instanceof GraphSymbol && symbol.described.type ? graph.type(symbol.described.type) : asked(() => classic.checker.getTypeOfSymbol(graph.toClassic(symbol))),
    getAliasedSymbol: (symbol: any) =>
      symbol instanceof GraphSymbol && symbol.described.aliased ? graph.symbol(symbol.described.aliased) : asked(() => classic.checker.getAliasedSymbol(graph.toClassic(symbol))),
    getPropertiesOfType: (type: any) => (type instanceof GraphType ? properties(type) : asked(() => classic.checker.getPropertiesOfType(type))),
    getPropertyOfType: (type: any, name: string) => (type instanceof GraphType ? property(type, name) : asked(() => classic.checker.getPropertyOfType(type, name))),
    getIndexInfosOfType: (type: any) => (type instanceof GraphType ? indexInfos(type) : asked(() => classic.checker.getIndexInfosOfType(type))),
    getTypeArguments: (type: any) => (type instanceof GraphType && type.described.args ? graph.typeList(type.described.args) : asked(() => classic.checker.getTypeArguments(graph.toClassic(type)))),
    isArrayType: (type: any) => (type instanceof GraphType ? !!type.described.array : asked(() => classic.checker.isArrayType(type))),
    isTupleType: (type: any) => (type instanceof GraphType ? !!type.described.tuple : asked(() => classic.checker.isTupleType(type))),
    getUndefinedType: () => (graph.undefinedType ??= asked(() => classic.checker.getUndefinedType())),
  };
  return new Proxy(classic.checker, {
    get(target, key) {
      if (typeof key === 'string' && handlers[key]) return handlers[key];
      const value = Reflect.get(target, key);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => graph.fromClassic(value.apply(target, args.map(graph.toClassic)));
    },
  });
}
