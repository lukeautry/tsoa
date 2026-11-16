/**
 * A TypeScript 6 Program and TypeChecker whose semantics come from a native helper (tsgo or tsrs) over the tsoa
 * facts protocol (./protocol.ts). Syntax stays on TypeScript 6: every source file is parsed here with
 * `ts.createSourceFile`, and its nodes are the ones tsoa walks. Types and symbols are TypeScript 6 objects whose fields
 * come from the helper's facts and whose `checker` is the native checker, so their own methods forward here.
 */
import * as ts from 'typescript';
import { openChannel, type Channel } from './channel';
import { flagValue, singleBitNames } from './flags';
import { detachFromParent, isJSDocTag, markSynthesized, objectConstructors } from './internals';
import type { NodeRef, SymbolFacts, SymbolId, TypeFacts, TypeId } from './protocol';
import { openHelperSession } from './session';
import { createSourceIndex } from './sourceIndex';

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
  const session = openHelperSession(channel, rootFiles, compilerOptions);
  const { ask, askHelper, opened } = session;
  const index = createSourceIndex(session, rootFiles, compilerOptions);
  const { fromRef } = index;
  /** A node query prefetches the node's file first, so later queries about its nodes need no request. */
  const refOf = (node: ts.Node): NodeRef => {
    const ref = index.refOf(node);
    index.ensurePrefetched(ref.file);
    return ref;
  };

  // Native types and symbols: fields read the helper's facts on first use. The base constructors assign flags,
  // escapedName and the rest, so instances skip them to keep the prototype getters visible. Ids are interned so `===`
  // keeps meaning "same type".
  const constructors = objectConstructors();
  class NativeType extends constructors.Type {
    declare nativeId: TypeId;
    get facts(): TypeFacts {
      const value = session.typeFacts(this.nativeId);
      Object.defineProperty(this, 'facts', { value });
      return value;
    }
  }
  class NativeSymbol extends constructors.Symbol {
    declare nativeId: SymbolId;
    get facts(): SymbolFacts {
      const value = session.symbolFacts(this.nativeId);
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

  index.bindDeclarationSymbols(symbolOf);
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
    session.learnTypesOfSymbols(answer.properties);
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
    getTypeFromTypeNode: node => typeOf(index.nodeAnswer('typeFromTypeNode', node)),
    getSymbolAtLocation: node => {
      if (node.pos < 0) return printedSymbols.get(node);
      const jsDoc = ts.findAncestor(node, isJSDocNode);
      return jsDoc ? symbolInJSDoc(node, jsDoc) : symbolOf(index.nodeAnswer('symbolAtLocation', node));
    },
    getSignatureFromDeclaration: declaration => signatureReturning(typeOf(ask({ op: 'returnTypeOfDeclaration', node: refOf(declaration) }))),
    getReturnTypeOfSignature: signature => returnTypes.get(signature)!,
    getConstantValue: node => ask({ op: 'constantValue', node: refOf(node) }) ?? undefined,
    getTypeOfSymbol: symbol => typeOf(session.typeOfSymbol(symbolId(symbol))),
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
    getSourceFiles: index.ownFiles,
    isSourceFileDefaultLibrary: index.isDefaultLibrary,
    close: session.close,
  };
}
