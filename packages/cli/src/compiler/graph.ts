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
interface DescribedSymbol {
  r: { name: string; flags: number; reference: { file?: string; id: number } };
  doc: string;
  type?: number;
  aliased?: number;
}
export interface Description {
  types: DescribedType[];
  symbols: DescribedSymbol[];
  nodeSymbols: Record<string, number>;
  nodeTypes: Record<string, number>;
  locationTypes: Record<string, number>;
  returnTypes: Record<string, number>;
  constants: Record<string, string | number>;
}

/** What the graph needs of the classic checker adapter (native.ts). */
export interface ClassicSide {
  checker: any;
  /** The API's own object for a type or symbol of the response, as the adapter presents it. */
  classicType(raw: DescribedType['r']): any;
  classicSymbol(raw: DescribedSymbol['r']): any;
  /** The API's object behind an object the adapter presents, if it is a type or symbol. */
  native(value: any): any;
  typeFlags: { BooleanLiteral: number; Union: number; Intersection: number; StringLiteral: number; NumberLiteral: number; BigIntLiteral: number; String: number; Number: number };
}

const symbolKey = (reference: { file?: string; id: number }) => `${reference.file ?? ''}#${reference.id}`;

class Graph {
  readonly types: GraphType[];
  readonly symbols: GraphSymbol[];
  private readonly typesById = new Map<number, GraphType>();
  private readonly symbolsByKey = new Map<string, GraphSymbol>();
  undefinedType: unknown;

  constructor(
    readonly description: Description,
    readonly classic: ClassicSide,
  ) {
    this.types = description.types.map(described => new GraphType(this, described));
    this.symbols = description.symbols.map(described => new GraphSymbol(this, described));
    for (const type of this.types) this.typesById.set(type.described.r.id, type);
    for (const symbol of this.symbols) this.symbolsByKey.set(symbolKey(symbol.described.r.reference), symbol);
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
      if (native.reference && typeof native.flags === 'number') return this.symbolsByKey.get(symbolKey(native.reference)) ?? value;
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
const ownKeys = new Set(['graph', 'described', 'classic', 'classicObject', 'declarationList', 'declaration', 'returnType']);
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
  classic(): any {
    return (this.classicObject ??= this.graph.classic.classicSymbol(this.described.r));
  }
  get escapedName() {
    return this.described.r.name;
  }
  get name() {
    // As the API's own symbols unescape it.
    const name = this.described.r.name;
    return name.startsWith('___') ? name.slice(1) : name;
  }
  get flags() {
    return this.described.r.flags;
  }
  get declarations() {
    return (this.declarationList ??= this.classic().declarations);
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
    return this.described.doc;
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
      const reference = node && node.pos !== -1 ? description.nodeSymbols[node.id] : undefined;
      return reference ? graph.symbols[reference - 1] : asked(() => classic.checker.getSymbolAtLocation(node));
    },
    getTypeFromTypeNode: (node: any) => {
      const reference = node && node.pos !== -1 ? description.nodeTypes[node.id] : undefined;
      return reference ? graph.types[reference - 1] : asked(() => classic.checker.getTypeFromTypeNode(node));
    },
    getTypeAtLocation: (node: any) => {
      const reference = node && node.pos !== -1 ? description.locationTypes[node.id] : undefined;
      return reference ? graph.types[reference - 1] : asked(() => classic.checker.getTypeAtLocation(node));
    },
    getSignatureFromDeclaration: (node: any) => {
      const reference = node && node.pos !== -1 ? description.returnTypes[node.id] : undefined;
      return reference ? new GraphSignature(graph, node, graph.types[reference - 1]) : asked(() => classic.checker.getSignatureFromDeclaration(node));
    },
    getReturnTypeOfSignature: (signature: any) => (signature instanceof GraphSignature ? signature.returnType : asked(() => classic.checker.getReturnTypeOfSignature(graph.toClassic(signature)))),
    getConstantValue: (node: any) => (node && node.id in description.constants ? description.constants[node.id] : asked(() => classic.checker.getConstantValue(node))),
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
