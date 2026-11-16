/** The checker tsoa's metadata generation calls, answered by the helper. */
import * as ts from 'typescript';
import { singleBitNames } from './flags';
import { detachFromParent, isJSDocTag, markSynthesized, objectConstructors } from './internals';
import type { NativeObjects, NativeSymbol, NativeType } from './objects';
import type { NodeRef } from './protocol';
import type { HelperSession } from './session';
import type { SourceIndex } from './sourceIndex';

const linkMeaning = singleBitNames(ts.SymbolFlags, ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace | ts.SymbolFlags.Alias);
const isJSDocNode = (node: ts.Node) => ts.isJSDoc(node) || isJSDocTag(node);

/** The checker methods tsoa's metadata generation calls. */
export type MetadataChecker = Pick<
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

interface Members {
  properties: ts.Symbol[];
  byName: Map<ts.__String, ts.Symbol>;
  indexInfos: ts.IndexInfo[];
}

export function createNativeChecker(session: HelperSession, index: SourceIndex, objects: NativeObjects): MetadataChecker {
  const { ask, askHelper } = session;
  const { typeOf, symbolOf } = objects;
  const typeId = (type: ts.Type) => (type as NativeType).nativeId;
  const symbolId = (symbol: ts.Symbol) => (symbol as NativeSymbol).nativeId;
  const facts = (type: ts.Type) => (type as NativeType).facts;
  /** A node query prefetches the node's file first, so later queries about its nodes need no request. */
  const prefetchedRef = (node: ts.Node): NodeRef => {
    const ref = index.refOf(node);
    index.ensurePrefetched(ref.file);
    return ref;
  };

  const SignatureConstructor = objectConstructors().Signature;
  const returnTypes = new WeakMap<ts.Signature, ts.Type | undefined>();
  const signatureReturning = (returnType: ts.Type | undefined) => {
    const signature = new SignatureConstructor(checker as unknown as ts.TypeChecker, 0);
    returnTypes.set(signature, returnType);
    return signature;
  };

  // One `members` answer per type: properties with their types, and index infos (protocol revision 5).
  const membersCache = new Map<ts.Type, Members>();
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
        declaration: index.fromRef(info.declaration) as ts.IndexSignatureDeclaration | undefined,
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

  /** Protocol revision 2: the helper does not see JSDoc, so a `{@link X}` resolves from the commented declaration. */
  const symbolInJSDoc = (node: ts.Node, jsDoc: ts.Node): ts.Symbol | undefined => {
    if (ts.isQualifiedName(node)) return checker.getSymbolAtLocation(node.left)?.exports?.get(node.right.escapedText);
    if (!ts.isIdentifier(node)) return undefined;
    const host = ts.findAncestor(jsDoc, ancestor => !isJSDocNode(ancestor) && ancestor.kind < ts.SyntaxKind.FirstJSDocNode);
    if (!host) return undefined;
    return symbolOf(ask({ op: 'resolveName', name: node.text, node: prefetchedRef(host), meaning: linkMeaning }));
  };

  const checker: MetadataChecker = {
    getTypeAtLocation: node => typeOf(ask({ op: 'typeAtLocation', node: prefetchedRef(node) })),
    getTypeFromTypeNode: node => typeOf(index.nodeAnswer('typeFromTypeNode', node)),
    getSymbolAtLocation: node => {
      if (node.pos < 0) return printedSymbols.get(node);
      const jsDoc = ts.findAncestor(node, isJSDocNode);
      return jsDoc ? symbolInJSDoc(node, jsDoc) : symbolOf(index.nodeAnswer('symbolAtLocation', node));
    },
    getSignatureFromDeclaration: declaration => signatureReturning(typeOf(ask({ op: 'returnTypeOfDeclaration', node: prefetchedRef(declaration) }))),
    getReturnTypeOfSignature: signature => returnTypes.get(signature)!,
    getConstantValue: node => ask({ op: 'constantValue', node: prefetchedRef(node) }) ?? undefined,
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
    getUndefinedType: () => typeOf(session.opened.undefinedType),
    getTypeArguments: type => (type as { resolvedTypeArguments?: readonly ts.Type[] }).resolvedTypeArguments ?? [],
    getBaseTypeOfLiteralType: type => typeOf(facts(type).baseLiteral) ?? type,
    getAliasedSymbol: symbol => symbolOf((symbol as NativeSymbol).facts.aliased) ?? symbol,
    isArrayType: type => facts(type).isArray,
    isTupleType: type => facts(type).isTuple,
    typeToString: type => ask({ op: 'typeToString', type: typeId(type) }),
    typeToTypeNode: type => printType(type),
  };
  return checker;
}
