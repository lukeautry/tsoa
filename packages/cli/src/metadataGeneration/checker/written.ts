/**
 * What written syntax says about a type: the type a written node denotes, and which written
 * nodes describe their type's shape. Used by the checker resolver; never decides a schema alone.
 */
import * as ts from 'typescript';
import { symbolAt } from './declarations';
import { childSite, emptySubstitutions, followSite, substitutionsCover, type Site, type Substitutions } from './site';

/**
 * The type the written node at `site` denotes, when the checker can tell: the node mentions no
 * type parameter in scope, or it is an identity alias (`type Id<T> = T`) of such a node.
 */
export function writtenType(checker: ts.TypeChecker, site: Site): ts.Type | undefined {
  const followed = followSite(site);
  const node = followed.node;
  if (!node || node.pos === -1) {
    return undefined;
  }
  if (!mentions(node, followed.substitutions)) {
    return checker.getTypeFromTypeNode(node);
  }
  if (ts.isTypeReferenceNode(node)) {
    const declaration = symbolAt(checker, node.typeName)?.declarations?.find(ts.isTypeAliasDeclaration);
    const body = declaration?.type;
    const index =
      body && ts.isTypeReferenceNode(body) && ts.isIdentifier(body.typeName) ? (declaration.typeParameters ?? []).findIndex(p => p.name.text === (body.typeName as ts.Identifier).text) : -1;
    const argument = index >= 0 ? (node.typeArguments?.[index] ?? declaration?.typeParameters?.[index].default) : undefined;
    return argument ? writtenType(checker, childSite(followed, argument)) : undefined;
  }
  return undefined;
}

/**
 * Nodes that do not describe their type's shape (conditional, indexed access, type queries…) are
 * replaced: indexed access by the indexed property's declaration, the others by nothing, so the
 * type is named as the checker prints it (what legacy did with `typeToTypeNode`).
 */
export function descriptiveSite(checker: ts.TypeChecker, site: Site): Site {
  const node = site.node;
  if (!node) {
    return site;
  }
  if (ts.isIndexedAccessTypeNode(node)) {
    // Legacy read the indexed property's (or element's) type node, but kept the outer declaration's JSDoc.
    const element = node.indexType.kind === ts.SyntaxKind.NumberKeyword ? writtenArrayElement(node.objectType) : undefined;
    if (element) {
      return descriptiveSite(checker, followSite({ ...site, node: element }));
    }
    const declaration = indexedDeclaration(checker, site, node);
    return declaration ? descriptiveSite(checker, followSite({ node: declaration.type, declaration: site.declaration, substitutions: emptySubstitutions })) : { ...site, node: undefined };
  }
  const opaque =
    ts.isConditionalTypeNode(node) ||
    ts.isTypeQueryNode(node) ||
    ts.isInferTypeNode(node) ||
    ts.isThisTypeNode(node) ||
    node.kind === ts.SyntaxKind.IntrinsicKeyword ||
    (ts.isTypeOperatorNode(node) && node.operator === ts.SyntaxKind.UniqueKeyword);
  return opaque ? { ...site, node: undefined } : site;
}

/** The declaration of `Obj['prop']`'s property, when it is written outside any generic scope. */
function indexedDeclaration(checker: ts.TypeChecker, site: Site, node: ts.IndexedAccessTypeNode): (ts.Declaration & { type: ts.TypeNode }) | undefined {
  const index = node.indexType;
  if (!ts.isLiteralTypeNode(index) || !(ts.isStringLiteral(index.literal) || ts.isNumericLiteral(index.literal))) {
    return undefined;
  }
  const objectType = writtenType(checker, childSite(site, node.objectType));
  const declaration = objectType && checker.getPropertyOfType(objectType, index.literal.text)?.valueDeclaration;
  const typed = declaration && (declaration as { type?: ts.TypeNode }).type;
  return typed && substitutionsCover(declaration, emptySubstitutions) ? (declaration as ts.Declaration & { type: ts.TypeNode }) : undefined;
}

/** The remaining member that is an instance of the model a written reference names. */
export function sameModel(checker: ts.TypeChecker, remaining: readonly ts.Type[], node: ts.TypeNode | undefined): ts.Type | undefined {
  if (!node || !ts.isTypeReferenceNode(node)) {
    return undefined;
  }
  const symbol = symbolAt(checker, node.typeName);
  return symbol ? remaining.find(member => member.aliasSymbol === symbol || (!member.aliasSymbol && member.getSymbol() === symbol)) : undefined;
}

/** The written element type of `E[]` or `Array<E>`, for `X[number]`. */
function writtenArrayElement(node: ts.TypeNode): ts.TypeNode | undefined {
  const inner = ts.isParenthesizedTypeNode(node) ? node.type : node;
  if (ts.isArrayTypeNode(inner)) {
    return inner.elementType;
  }
  return ts.isTypeReferenceNode(inner) && ts.isIdentifier(inner.typeName) && inner.typeName.text === 'Array' ? inner.typeArguments?.[0] : undefined;
}

/** Whether a written node refers to any of the type parameters in scope. */
function mentions(node: ts.Node, substitutions: Substitutions): boolean {
  if (substitutions.size === 0) {
    return false;
  }
  let found = false;
  const visit = (child: ts.Node) => {
    if (found) {
      return;
    }
    if (ts.isTypeReferenceNode(child) && ts.isIdentifier(child.typeName) && substitutions.has(child.typeName.text)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

export function nullishKeyword(node: ts.TypeNode | undefined): 'null' | 'undefined' | undefined {
  if (!node) {
    return undefined;
  }
  if (ts.isLiteralTypeNode(node) && node.literal.kind === ts.SyntaxKind.NullKeyword) {
    return 'null';
  }
  return node.kind === ts.SyntaxKind.UndefinedKeyword ? 'undefined' : undefined;
}

export function typeArgumentNode(node: ts.TypeNode | undefined, index: number): ts.TypeNode | undefined {
  return node && ts.isTypeReferenceNode(node) ? node.typeArguments?.[index] : undefined;
}

/** The written element type of `T[]`, `readonly T[]`, `Array<T>` or `ReadonlyArray<T>`. */
export function arrayElementNode(node: ts.TypeNode | undefined): ts.TypeNode | undefined {
  if (!node) {
    return undefined;
  }
  if (ts.isArrayTypeNode(node)) {
    return node.elementType;
  }
  if (ts.isTypeOperatorNode(node) && node.operator === ts.SyntaxKind.ReadonlyKeyword) {
    return arrayElementNode(node.type);
  }
  if (ts.isParenthesizedTypeNode(node)) {
    return arrayElementNode(node.type);
  }
  return typeArgumentNode(node, 0);
}
