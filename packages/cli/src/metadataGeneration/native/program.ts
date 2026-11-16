/**
 * A TypeScript 6 Program and TypeChecker whose semantics come from a native helper (tsgo or tsrs) over the tsoa
 * facts protocol (./protocol.ts). Syntax stays on TypeScript 6: every source file is parsed here with
 * `ts.createSourceFile`, and its nodes are the ones tsoa walks. Types and symbols are TypeScript 6 objects whose fields
 * come from the helper's facts and whose `checker` is the native checker, so their own methods forward here.
 */
import * as path from 'node:path';
import * as ts from 'typescript';
import { openChannel, type Channel } from './channel';
import { defineBoundSymbol, detachFromParent, isDeclaration, isJSDocTag, markSynthesized, objectConstructors, optionsDirectory, tsconfigCompilerOptions } from './internals';
import type { Answer, FileId, FileInfo, NodeRef, Op, Query, SymbolFacts, SymbolId, TypeFacts, TypeId } from './protocol';

/** The checker methods tsoa's metadata generation calls. */
type CheckerSubset = Pick<
  ts.TypeChecker,
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
> & { getUnionType(types: readonly ts.Type[]): ts.Type };

export interface NativeProgram extends Pick<ts.Program, 'getTypeChecker' | 'getSourceFiles' | 'isSourceFileDefaultLibrary'> {
  close(): void;
}

type NodeOp = 'symbolAtLocation' | 'typeFromTypeNode' | 'symbolOfDeclaration';

type FlagTable = Record<string, string | number>;

/**
 * TypeScript enums declare several names for one value (`Alias = AliasExcludes`, `QualifiedName = FirstNode`).
 * The first declared name is the member's own name; the protocol uses only those.
 */
function ownNames(table: FlagTable): Map<number, string> {
  const names = new Map<number, string>();
  for (const [name, value] of Object.entries(table)) {
    if (typeof value === 'number' && !names.has(value)) names.set(value, name);
  }
  return names;
}

function singleBitNames(table: FlagTable, mask: number): string[] {
  return [...ownNames(table)].filter(([value]) => value && (value & (value - 1)) === 0 && (mask & value) === value).map(([, name]) => name);
}

type FlagEnum = 'TypeFlags' | 'ObjectFlags' | 'SymbolFlags' | 'ElementFlags';

const flagTables: Record<FlagEnum, FlagTable> = {
  TypeFlags: ts.TypeFlags,
  ObjectFlags: ts.ObjectFlags,
  SymbolFlags: ts.SymbolFlags,
  ElementFlags: ts.ElementFlags,
};

/** tsgo and tsrs bookkeeping bits TypeScript 6 has no member for; they carry nothing tsoa reads (protocol revision 8). */
const helperOnlyFlagNames: Record<FlagEnum, ReadonlySet<string>> = {
  TypeFlags: new Set(),
  ObjectFlags: new Set(['MembersResolved', 'FromTypeNode']),
  SymbolFlags: new Set(['ConstEnumOnlyModule', 'ReplaceableByMethod']),
  ElementFlags: new Set(),
};

function flagValue(flagEnum: FlagEnum, names: string[]): number {
  const table = flagTables[flagEnum];
  let value = 0;
  for (const name of names) {
    const bit = table[name];
    if (typeof bit === 'number') value |= bit;
    else if (!helperOnlyFlagNames[flagEnum].has(name)) throw new Error(`unknown ${flagEnum} name ${name} from tsoa compiler helper`);
  }
  return value;
}

const kindNames = ownNames(ts.SyntaxKind);
const kindName = (kind: ts.SyntaxKind) => kindNames.get(kind) ?? String(kind);
const nodeKey = (pos: number, end: number, kind: string) => `${pos}:${end}:${kind}`;

/** The protocol revision (PROTOCOL.md) this program speaks; `open` must report the same. */
const protocolRevision = 8;

export function createNativeProgram(helperPath: string, rootFiles: readonly string[], compilerOptions: ts.CompilerOptions): NativeProgram {
  const channel = openChannel(helperPath);
  try {
    return createProgramOverChannel(channel, rootFiles, compilerOptions);
  } catch (error) {
    channel.close();
    throw error;
  }
}

function createProgramOverChannel(channel: Channel, rootFiles: readonly string[], compilerOptions: ts.CompilerOptions): NativeProgram {
  const inlineTypes = new Map<TypeId, TypeFacts>();
  const inlineSymbols = new Map<SymbolId, SymbolFacts>();

  const askHelper = <O extends Op>(query: Query<O>, failure = `tsoa compiler helper: ${query.op} failed`): Answer<O> => {
    const response = channel.request(query as Query);
    if (!response.ok) throw new Error(`${failure}: ${response.error}`);
    for (const [id, facts] of Object.entries(response.facts?.types ?? {})) inlineTypes.set(Number(id) as TypeId, facts);
    for (const [id, facts] of Object.entries(response.facts?.symbols ?? {})) inlineSymbols.set(Number(id) as SymbolId, facts);
    return response.result as Answer<O>;
  };
  // Every op except open and close is a pure function of its input within one session. Interning keeps object
  // identity; this keeps the helper from being asked twice.
  const memo = new Map<string, unknown>();
  const ask = <O extends Op>(query: Query<O>): Answer<O> => {
    const key = JSON.stringify(query);
    if (memo.has(key)) return memo.get(key) as Answer<O>;
    const result = askHelper(query);
    memo.set(key, result);
    return result;
  };

  const directory = optionsDirectory(compilerOptions) ?? process.cwd();
  const absoluteRoots = rootFiles.map(file => path.resolve(file));
  const opened = askHelper({ op: 'open', cwd: directory, rootFiles: absoluteRoots, compilerOptions: tsconfigCompilerOptions(compilerOptions, directory) });
  if (opened.protocol !== protocolRevision) throw new Error(`tsoa compiler helper speaks protocol ${opened.protocol}, this tsoa needs ${protocolRevision}`);

  // Declaration files (lib.*.d.ts, @types, package typings) are parsed only when a fact points into them. tsoa walks
  // only the program's own files for controllers.
  const sourceFiles = new Map<FileId, ts.SourceFile>();
  const fileIds = new Map<ts.SourceFile, FileId>();
  const defaultLibraries = new Set<ts.SourceFile>();
  const infos = new Map(opened.files.map(info => [info.id, info]));
  const parseFile = (info: FileInfo) => {
    const text = ask({ op: 'fileText', file: info.id });
    // TypeScript 6 names a root file as it was given (relative stays relative), other files by their resolved path.
    const given = rootFiles[absoluteRoots.indexOf(info.fileName)];
    const fileName = info.fileName.startsWith('bundled:///') ? path.join('/__tsoa_bundled__', info.fileName.slice('bundled:///'.length)) : (given ?? info.fileName);
    const sourceFile = ts.createSourceFile(fileName, text, compilerOptions.target ?? ts.ScriptTarget.ES2021, true);
    fileIds.set(sourceFile, info.id);
    if (info.isDefaultLibrary) defaultLibraries.add(sourceFile);
    sourceFiles.set(info.id, sourceFile);
    return sourceFile;
  };
  const fileOf = (id: FileId) => {
    const sourceFile = sourceFiles.get(id);
    if (sourceFile) return sourceFile;
    const info = infos.get(id);
    if (!info) throw new Error(`tsoa compiler helper: unknown file ${id}`);
    return parseFile(info);
  };
  for (const info of opened.files) {
    if (!info.isDeclarationFile) parseFile(info);
  }

  // NodeRef <-> TypeScript 6 node. One walk per file indexes nodes by NodeRef key (the first in preorder wins) and
  // gives declarations their binder symbol.
  const nodeIndexes = new Map<ts.SourceFile, Map<string, ts.Node>>();
  const indexFile = (sourceFile: ts.SourceFile) => {
    let index = nodeIndexes.get(sourceFile);
    if (index) return index;
    const nodes = new Map<string, ts.Node>();
    const visit = (node: ts.Node) => {
      const key = nodeKey(node.pos, node.end, kindName(node.kind));
      if (!nodes.has(key)) nodes.set(key, node);
      if (isDeclaration(node)) defineBoundSymbol(node, () => symbolOf(nodeAnswer('symbolOfDeclaration', node)));
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    index = nodes;
    nodeIndexes.set(sourceFile, index);
    return index;
  };
  const fromRef = (ref: NodeRef | undefined): ts.Node | undefined => {
    if (!ref) return undefined;
    const sourceFile = fileOf(ref.file);
    if (ref.kind === 'SourceFile') return sourceFile;
    const node = indexFile(sourceFile).get(nodeKey(ref.pos, ref.end, ref.kind));
    if (!node) throw new Error(`tsoa compiler helper: no TypeScript 6 node at ${sourceFile.fileName}:${ref.pos}-${ref.end} ${ref.kind}`);
    return node;
  };

  // Per-file answers for every identifier, type node and declaration, fetched the first time tsoa asks about a node in
  // the file (protocol revision 4b).
  const byNode: Record<NodeOp, WeakMap<ts.Node, number | null>> = {
    symbolAtLocation: new WeakMap(),
    typeFromTypeNode: new WeakMap(),
    symbolOfDeclaration: new WeakMap(),
  };
  const typeOfSymbolIds = new Map<SymbolId, TypeId>();
  const prefetched = new Set<FileId>();
  const prefetch = (file: FileId) => {
    if (prefetched.has(file)) return;
    prefetched.add(file);
    const sourceFile = sourceFiles.get(file);
    if (!sourceFile || sourceFile.isDeclarationFile) return;
    const answers = askHelper({ op: 'prefetchFile', file }, `tsoa compiler helper failed on ${infos.get(file)!.fileName}`);
    const index = indexFile(sourceFile);
    const seed = (op: NodeOp, entries: Array<[number, number, string, number | null]>) => {
      for (const [pos, end, kind, id] of entries) {
        // Protocol revision 1: tsgo reports an interface's `extends X` as a TypeReference.
        const node = index.get(nodeKey(pos, end, kind)) ?? (kind === 'TypeReference' ? index.get(nodeKey(pos, end, 'ExpressionWithTypeArguments')) : undefined);
        if (node) byNode[op].set(node, id);
      }
    };
    seed('symbolAtLocation', answers.symbolAt);
    seed('typeFromTypeNode', answers.typeFrom);
    seed('symbolOfDeclaration', answers.declared);
    for (const [symbol, type] of answers.typeOfSymbol) typeOfSymbolIds.set(symbol, type);
  };
  const refOf = (node: ts.Node): NodeRef => {
    const file = node.pos < 0 ? undefined : fileIds.get(node.getSourceFile());
    if (file === undefined) throw new Error(`tsoa compiler helper: node outside the program: ${kindName(node.kind)}`);
    prefetch(file);
    return { file, pos: node.pos, end: node.end, kind: kindName(node.kind) };
  };
  const nodeAnswer = <O extends NodeOp>(op: O, node: ts.Node): Answer<O> => {
    const answers = byNode[op];
    if (!answers.has(node)) {
      const ref = refOf(node);
      if (!answers.has(node)) answers.set(node, ask({ op, node: ref }));
    }
    return answers.get(node) as Answer<O>;
  };

  // Native types and symbols: fields read the helper's facts on first use. The base constructors assign flags,
  // escapedName and the rest, so instances skip them to keep the prototype getters visible. Ids are interned so `===`
  // keeps meaning "same type".
  const constructors = objectConstructors();
  class NativeType extends constructors.Type {
    declare nativeId: TypeId;
    get facts(): TypeFacts {
      const value = inlineTypes.get(this.nativeId) ?? ask({ op: 'type', type: this.nativeId });
      Object.defineProperty(this, 'facts', { value });
      return value;
    }
  }
  class NativeSymbol extends constructors.Symbol {
    declare nativeId: SymbolId;
    get facts(): SymbolFacts {
      const value = inlineSymbols.get(this.nativeId) ?? ask({ op: 'symbol', symbol: this.nativeId });
      Object.defineProperty(this, 'facts', { value });
      return value;
    }
    get exports(): ts.SymbolTable {
      const id = this.nativeId;
      return { get: (name: ts.__String) => symbolOf(ask({ op: 'exportOf', symbol: id, name: String(name) })) } as ts.SymbolTable;
    }
  }
  const defineFields = <Facts>(prototype: object, fields: Record<string, (facts: Facts) => unknown>) => {
    for (const [name, compute] of Object.entries(fields)) {
      const own = (target: object, value: unknown) => Object.defineProperty(target, name, { value, writable: true, enumerable: true, configurable: true });
      Object.defineProperty(prototype, name, {
        configurable: true,
        get(this: { facts: Facts }) {
          const value = compute(this.facts);
          own(this, value);
          return value;
        },
        set(this: object, value: unknown) {
          own(this, value);
        },
      });
    }
  };
  defineFields<TypeFacts>(NativeType.prototype, {
    flags: facts => flagValue('TypeFlags', facts.flags),
    objectFlags: facts => flagValue('ObjectFlags', facts.objectFlags),
    symbol: facts => symbolOf(facts.symbol),
    aliasSymbol: facts => symbolOf(facts.aliasSymbol),
    aliasTypeArguments: facts => facts.aliasTypeArguments?.map(typeOf),
    types: facts => facts.types?.map(typeOf),
    origin: facts => typeOf(facts.origin),
    target: facts => typeOf(facts.target),
    intrinsicName: facts => facts.intrinsicName,
    value: facts => (facts.value && typeof facts.value === 'object' ? { negative: facts.value.negative, base10Value: facts.value.base10Value } : facts.value),
    elementFlags: facts => facts.elementFlags?.map(names => flagValue('ElementFlags', names)),
    resolvedTypeArguments: facts => facts.typeArguments?.map(typeOf),
  });
  defineFields<SymbolFacts>(NativeSymbol.prototype, {
    flags: facts => flagValue('SymbolFlags', facts.flags),
    escapedName: facts => facts.escapedName,
    declarations: facts => (facts.declarations.length ? facts.declarations.map(fromRef) : undefined),
    valueDeclaration: facts => fromRef(facts.valueDeclaration),
    parent: facts => symbolOf(facts.parent),
    links: facts => ({ syntheticOrigin: symbolOf(facts.syntheticOrigin) }),
  });

  const types = new Map<TypeId, NativeType>();
  const symbols = new Map<SymbolId, NativeSymbol>();
  function typeOf(id: TypeId): NativeType;
  function typeOf(id: TypeId | null | undefined): NativeType | undefined;
  function typeOf(id: TypeId | null | undefined) {
    if (id === null || id === undefined) return undefined;
    let type = types.get(id);
    if (!type) {
      type = Object.assign(Object.create(NativeType.prototype) as NativeType, { checker, nativeId: id });
      types.set(id, type);
    }
    return type;
  }
  function symbolOf(id: SymbolId | null | undefined): NativeSymbol | undefined {
    if (id === null || id === undefined) return undefined;
    let symbol = symbols.get(id);
    if (!symbol) {
      symbol = Object.assign(Object.create(NativeSymbol.prototype) as NativeSymbol, { nativeId: id });
      symbols.set(id, symbol);
    }
    return symbol;
  }
  const typeId = (type: ts.Type) => (type as NativeType).nativeId;
  const symbolId = (symbol: ts.Symbol) => (symbol as NativeSymbol).nativeId;
  const facts = (type: ts.Type) => (type as NativeType).facts;

  const returnTypes = new WeakMap<ts.Signature, ts.Type | undefined>();
  const signatureReturning = (returnType: ts.Type | undefined) => {
    const signature = new constructors.Signature(checker as unknown as ts.TypeChecker, 0);
    returnTypes.set(signature, returnType);
    return signature;
  };

  // One `members` answer per type: properties with their types, and index infos (protocol revision 5).
  const membersCache = new Map<ts.Type, { properties: ts.Symbol[]; byName: Map<ts.__String, ts.Symbol>; indexInfos: ts.IndexInfo[] }>();
  const membersOf = (type: ts.Type) => {
    let members = membersCache.get(type);
    if (members) return members;
    const answer = askHelper({ op: 'members', type: typeId(type) });
    for (const [symbol, propertyType] of answer.properties) typeOfSymbolIds.set(symbol, propertyType);
    const properties: ts.Symbol[] = answer.properties.map(([id]) => symbolOf(id)!);
    members = {
      properties,
      byName: new Map(properties.map(property => [property.escapedName, property])),
      indexInfos: answer.indexInfos.map(info => ({
        keyType: typeOf(info.keyType),
        type: typeOf(info.type),
        isReadonly: info.isReadonly,
        declaration: fromRef(info.declaration) as ts.IndexSignatureDeclaration | undefined,
      })),
    };
    membersCache.set(type, members);
    return members;
  };

  // Printed type nodes: the helper's text re-parsed in TypeScript 6, marked synthetic, its identifiers bound in preorder.
  const printedSymbols = new WeakMap<ts.Node, ts.Symbol | undefined>();
  const printType = (type: ts.Type): ts.TypeNode | undefined => {
    const printed = ask({ op: 'print', type: typeId(type) });
    if (!printed) return undefined;
    const host = ts.createSourceFile('__printed.ts', `type __T = ${printed.text};`, ts.ScriptTarget.Latest, true);
    const node = (host.statements[0] as ts.TypeAliasDeclaration).type;
    const identifiers: ts.Identifier[] = [];
    const collect = (child: ts.Node) => {
      if (ts.isIdentifier(child)) identifiers.push(child);
      ts.forEachChild(child, collect);
    };
    collect(node);
    if (identifiers.length !== printed.identifiers.length) {
      throw new Error(`tsoa compiler helper: printed identifiers differ: ${identifiers.length} vs ${printed.identifiers.length} in ${printed.text}`);
    }
    identifiers.forEach((identifier, i) => {
      const symbol = symbolOf(printed.identifiers[i]);
      if (symbol && symbol.escapedName !== identifier.escapedText) {
        throw new Error(`tsoa compiler helper: printed identifier ${identifier.text} is bound to ${String(symbol.escapedName)} in ${printed.text}`);
      }
      printedSymbols.set(identifier, symbol);
    });
    const synthesize = (child: ts.Node) => {
      ts.forEachChild(child, synthesize);
      markSynthesized(child);
    };
    synthesize(node);
    detachFromParent(node);
    return node;
  };

  const linkMeaning = singleBitNames(ts.SymbolFlags, ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace | ts.SymbolFlags.Alias);
  const isJSDocNode = (node: ts.Node) => ts.isJSDoc(node) || isJSDocTag(node);
  /** Protocol revision 2: the helper does not see JSDoc, so a `{@link X}` resolves from the commented declaration. */
  const symbolInJSDoc = (node: ts.Node, jsDoc: ts.Node): ts.Symbol | undefined => {
    if (ts.isQualifiedName(node)) return checker.getSymbolAtLocation(node.left)?.exports?.get(node.right.escapedText);
    if (!ts.isIdentifier(node)) return undefined;
    const host = ts.findAncestor(jsDoc, ancestor => !isJSDocNode(ancestor) && ancestor.kind < ts.SyntaxKind.FirstJSDocNode);
    if (!host) return undefined;
    return symbolOf(ask({ op: 'resolveName', name: node.text, node: refOf(host), meaning: linkMeaning }));
  };

  const checker: CheckerSubset = {
    getTypeAtLocation: node => typeOf(ask({ op: 'typeAtLocation', node: refOf(node) })),
    getTypeFromTypeNode: node => typeOf(nodeAnswer('typeFromTypeNode', node)),
    getSymbolAtLocation: node => {
      if (node.pos < 0) return printedSymbols.get(node);
      const jsDoc = ts.findAncestor(node, isJSDocNode);
      return jsDoc ? symbolInJSDoc(node, jsDoc) : symbolOf(nodeAnswer('symbolAtLocation', node));
    },
    getSignatureFromDeclaration: declaration => signatureReturning(typeOf(ask({ op: 'returnTypeOfDeclaration', node: refOf(declaration) }))),
    getReturnTypeOfSignature: signature => returnTypes.get(signature)!,
    getConstantValue: node => ask({ op: 'constantValue', node: refOf(node) }) ?? undefined,
    getTypeOfSymbol: symbol => typeOf(typeOfSymbolIds.get(symbolId(symbol)) ?? ask({ op: 'typeOfSymbol', symbol: symbolId(symbol) })),
    getPropertiesOfType: type => membersOf(type).properties,
    getPropertyOfType: (type, name) => membersOf(type).byName.get(name as ts.__String) ?? symbolOf(ask({ op: 'property', type: typeId(type), name })),
    getIndexInfosOfType: type => membersOf(type).indexInfos,
    getIndexInfoOfType: (type, kind) => checker.getIndexInfosOfType(type).find(info => info.keyType.flags & (kind === ts.IndexKind.Number ? ts.TypeFlags.Number : ts.TypeFlags.String)),
    getIndexTypeOfType: (type, kind) => checker.getIndexInfoOfType(type, kind)?.type,
    getSignaturesOfType: (type, kind) => (kind === ts.SignatureKind.Call ? ask({ op: 'callSignatures', type: typeId(type) }).map(signature => signatureReturning(typeOf(signature.returnType))) : []),
    getNonNullableType: type => typeOf(ask({ op: 'nonNullable', type: typeId(type) })),
    getUnionType: list => typeOf(ask({ op: 'union', types: list.map(typeId) })),
    isTypeAssignableTo: (source, target) => ask({ op: 'assignable', source: typeId(source), target: typeId(target) }),
    getUndefinedType: () => typeOf(opened.undefinedType),
    getTypeArguments: type => (type as { resolvedTypeArguments?: readonly ts.Type[] }).resolvedTypeArguments ?? [],
    getBaseTypeOfLiteralType: type => typeOf(facts(type).baseLiteral) ?? type,
    getAliasedSymbol: symbol => symbolOf((symbol as NativeSymbol).facts.aliased) ?? symbol,
    isArrayType: type => facts(type).isArray,
    isTupleType: type => facts(type).isTuple,
    typeToString: type => ask({ op: 'typeToString', type: typeId(type) }),
    typeToTypeNode: type => printType(type),
  };

  return {
    getTypeChecker: () => checker as unknown as ts.TypeChecker,
    getSourceFiles: () => opened.files.filter(info => !info.isDeclarationFile).map(info => fileOf(info.id)),
    isSourceFileDefaultLibrary: sourceFile => defaultLibraries.has(sourceFile),
    // A program that is never closed (a MetadataGenerator built but never `Generate()`d) keeps its helper until this
    // process exits.
    close: () => {
      try {
        askHelper({ op: 'close' });
      } catch {
        // A helper that already exited cannot answer; it is killed below either way.
      }
      channel.close();
    },
  };
}
