import * as ts from 'typescript';
import { GenerateMetadataError } from '../exceptions';
import type { TypeNamer } from './naming';

/**
 * Syntax that travels alongside a checker type. It never decides what a schema is; it only supplies
 * names (as written in source), JSDoc/decorator hints, and erased aliases.
 */
export interface Site {
  /** The type annotation at this position, if the type was written in source. */
  node?: ts.TypeNode;
  /** The declaration owning this position (property, parameter, alias), for JSDoc and decorator hints. */
  declaration?: ts.Node;
  /** Written type arguments for the type parameters in scope, keyed by type-parameter name. */
  substitutions: Substitutions;
  /** Set only on the site of an alias's own body; child sites never carry it. */
  aliasBody?: ts.TypeAliasDeclaration;
}

export interface Substitution {
  /** The written type argument (or default). */
  node: ts.TypeNode;
  /** The argument's type name, used when naming references to the type parameter. */
  name: string;
  /** The substitutions in scope where `node` was written. */
  scope: Substitutions;
  /** The generic declaration whose type parameter this binds. */
  owner: ts.Node;
}

export type Substitutions = ReadonlyMap<string, Substitution>;

export const emptySubstitutions: Substitutions = new Map();

export function rootSite(node?: ts.TypeNode, declaration?: ts.Node): Site {
  return { node, declaration, substitutions: emptySubstitutions };
}

export function childSite(site: Site, node: ts.TypeNode | undefined, declaration?: ts.Node): Site {
  return { node, declaration: declaration ?? site.declaration, substitutions: site.substitutions };
}

/**
 * Strips parentheses and replaces references to type parameters with the written argument,
 * repeating until the node is neither.
 */
export function followSite(site: Site): Site {
  let current = site;
  for (;;) {
    const node = current.node;
    if (node && ts.isParenthesizedTypeNode(node)) {
      current = { ...current, node: node.type };
      continue;
    }
    const substitution = node && ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) ? current.substitutions.get(node.typeName.text) : undefined;
    if (substitution && substitution.node !== node) {
      current = { ...current, node: substitution.node, substitutions: substitution.scope };
      continue;
    }
    return current;
  }
}

/**
 * Maps a generic declaration's type parameters to the arguments written at `reference`:
 * a forwarded type parameter, the argument, or the default. Written arguments are read in the
 * caller's scope; a default is read in the declaration's own scope, so it can refer to the
 * parameters bound before it (`interface Pair<T = string, U = T>`).
 */
export function substitutionsFor(
  reference: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments,
  typeParameters: readonly ts.TypeParameterDeclaration[] | undefined,
  outer: Site,
  namer: TypeNamer,
): Substitutions {
  const substitutions = new Map<string, Substitution>();
  (typeParameters ?? []).forEach((typeParameter, index) => {
    const typeArg = reference.typeArguments?.[index];
    const forwarded = typeArg && ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName) ? outer.substitutions.get(typeArg.typeName.text) : undefined;
    if (forwarded) {
      substitutions.set(typeParameter.name.text, { ...forwarded, owner: typeParameter.parent });
      return;
    }
    const node = typeArg ?? typeParameter.default;
    if (!node) {
      throw new GenerateMetadataError(`Could not find a value for type parameter ${typeParameter.name.text}`, reference);
    }
    const scope = typeArg ? outer.substitutions : new Map(substitutions);
    substitutions.set(typeParameter.name.text, { node, name: namer.typeName(node, scope), scope, owner: typeParameter.parent });
  });
  return substitutions;
}

/**
 * Whether written nodes inside `node` can be read with `substitutions`: true when the nearest
 * enclosing generic declaration has all of its type parameters bound by these substitutions.
 */
export function substitutionsCover(node: ts.Node, substitutions: Substitutions): boolean {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    const typeParameters = (current as { typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration> }).typeParameters;
    if (typeParameters?.length && (ts.isInterfaceDeclaration(current) || ts.isClassDeclaration(current) || ts.isTypeAliasDeclaration(current))) {
      return typeParameters.every(parameter => substitutions.get(parameter.name.text)?.owner === current);
    }
  }
  return true;
}
