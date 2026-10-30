/**
 * What written syntax says about a type: the type a written node denotes, and which written
 * nodes describe their type's shape. Used by the type resolver; never decides a schema alone.
 */
import * as ts from '../../compiler/index';
import { symbolAt } from './declarations';
import { unionOf } from './internals';
import { childSite, emptySubstitutions, followSite, substitutionsCover, type Site, type Substitution, type Substitutions } from './site';

/**
 * The type the written node at `site` denotes, when the checker can tell: the node mentions no
 * type parameter in scope, or it references a generic alias whose body can be read with the
 * alias's parameters bound to the written arguments (`Nullable<T>` with `type Nullable<T> = T | null`).
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
    if (!declaration?.typeParameters?.length) {
      return undefined;
    }
    // Arguments are read in the caller's scope; defaults in the alias's own scope.
    const bound = new Map<string, Substitution>();
    declaration.typeParameters.forEach((parameter, index) => {
      const argument = node.typeArguments?.[index];
      const value = argument ?? parameter.default;
      if (value) {
        bound.set(parameter.name.text, { node: value, name: '', scope: argument ? followed.substitutions : new Map(bound), owner: declaration });
      }
    });
    return aliasBodyType(checker, { node: declaration.type, declaration, substitutions: bound });
  }
  return undefined;
}

/** An alias body's type: the body itself, or a union whose members are each known. */
function aliasBodyType(checker: ts.TypeChecker, site: Site): ts.Type | undefined {
  const body = site.node;
  if (!body || !ts.isUnionTypeNode(body)) {
    return writtenType(checker, site);
  }
  const members = body.types.map(member => writtenType(checker, childSite(site, member)));
  if (members.some(member => member === undefined)) {
    return undefined;
  }
  return unionOf(
    checker,
    (members as ts.Type[]).flatMap(member => (member.isUnion() ? member.types : [member])),
  );
}

/**
 * Nodes that do not describe their type's shape (conditional, indexed access, type queries…) are
 * replaced: indexed access by the indexed property's declaration, the others by nothing, so the
 * type is named as the checker prints it.
 */
export function descriptiveSite(checker: ts.TypeChecker, site: Site): Site {
  const node = site.node;
  if (!node) {
    return site;
  }
  if (ts.isIndexedAccessTypeNode(node)) {
    // Read the indexed property's (or element's) type node, but keep the outer declaration's JSDoc.
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

/**
 * The declaration of `Obj['prop']`'s property, or of the index signature `Obj[string]` or
 * `Obj[number]` reads, when it is written outside any generic scope.
 */
function indexedDeclaration(checker: ts.TypeChecker, site: Site, node: ts.IndexedAccessTypeNode): (ts.Declaration & { type: ts.TypeNode }) | undefined {
  const index = node.indexType;
  const literal = ts.isLiteralTypeNode(index) && (ts.isStringLiteral(index.literal) || ts.isNumericLiteral(index.literal)) ? index.literal : undefined;
  const keyword = index.kind === ts.SyntaxKind.StringKeyword || index.kind === ts.SyntaxKind.NumberKeyword;
  const objectType = literal || keyword ? writtenType(checker, childSite(site, node.objectType)) : undefined;
  if (!objectType) {
    return undefined;
  }
  const declaration = literal ? checker.getPropertyOfType(objectType, literal.text)?.valueDeclaration : indexSignature(checker, objectType, index.kind === ts.SyntaxKind.NumberKeyword);
  const typed = declaration && (declaration as { type?: ts.TypeNode }).type;
  return typed && substitutionsCover(declaration, emptySubstitutions) ? (declaration as ts.Declaration & { type: ts.TypeNode }) : undefined;
}

/** The index signature a `string` (or `number`, which falls back to `string`) key reads. */
function indexSignature(checker: ts.TypeChecker, objectType: ts.Type, numberKey: boolean): ts.IndexSignatureDeclaration | undefined {
  const info = (numberKey ? checker.getIndexInfoOfType(objectType, ts.IndexKind.Number) : undefined) ?? checker.getIndexInfoOfType(objectType, ts.IndexKind.String);
  return info?.declaration;
}

/**
 * The remaining member that is an instance of the model a written reference names. When several
 * instantiations of one generic remain (`Result<L> | Result<R>`), the written type arguments —
 * resolved through the substitutions — pick one; if they cannot, there is no match.
 */
export function sameModel(checker: ts.TypeChecker, remaining: readonly ts.Type[], site: Site): ts.Type | undefined {
  const node = site.node;
  if (!node || !ts.isTypeReferenceNode(node)) {
    return undefined;
  }
  const symbol = symbolAt(checker, node.typeName);
  const candidates = symbol ? remaining.filter(member => member.aliasSymbol === symbol || (!member.aliasSymbol && member.getSymbol() === symbol)) : [];
  if (candidates.length <= 1) {
    return candidates[0];
  }
  const written = (node.typeArguments ?? []).map(argument => writtenType(checker, childSite(site, argument)));
  if (!written.length || written.some(argument => argument === undefined)) {
    return undefined;
  }
  const argumentsOf = (member: ts.Type) => member.aliasTypeArguments ?? (member.flags & ts.TypeFlags.Object ? checker.getTypeArguments(member as ts.TypeReference) : []);
  const matching = candidates.filter(member => {
    const actual = argumentsOf(member);
    return actual.length === written.length && actual.every((argument, i) => argument === written[i]);
  });
  return matching.length === 1 ? matching[0] : undefined;
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
