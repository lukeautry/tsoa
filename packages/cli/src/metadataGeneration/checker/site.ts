import * as ts from 'typescript';
import { GenerateMetadataError } from '../exceptions';
import type { LegacyNamer } from './naming';

/**
 * Syntax that travels alongside a checker type. It never decides what a schema is; it only supplies
 * names (as written in source), JSDoc/decorator hints, and erased aliases.
 */
export interface Site {
  /** The type annotation at this position, if the type was written in source. */
  node?: ts.TypeNode;
  /** The declaration owning this position (property, parameter, alias), for JSDoc and decorator hints. */
  declaration?: ts.Node;
  /** Written type arguments for the type parameters in scope, keyed by type-parameter name (as legacy does). */
  substitutions: Substitutions;
}

export interface Substitution {
  /** The written type argument (or default). */
  node: ts.TypeNode;
  /** The argument's legacy type name, used when naming references to the type parameter. */
  name: string;
  /** The substitutions in scope where `node` was written. */
  scope: Substitutions;
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
 * Maps a generic declaration's type parameters to the arguments written at `reference`
 * (port of legacy `typeArgumentsToContext`): a forwarded type parameter, the argument, or the default.
 */
export function substitutionsFor(
  reference: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments,
  typeParameters: readonly ts.TypeParameterDeclaration[] | undefined,
  outer: Site,
  namer: LegacyNamer,
): Substitutions {
  const substitutions = new Map<string, Substitution>();
  (typeParameters ?? []).forEach((typeParameter, index) => {
    const typeArg = reference.typeArguments?.[index];
    const forwarded = typeArg && ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName) ? outer.substitutions.get(typeArg.typeName.text) : undefined;
    if (forwarded) {
      substitutions.set(typeParameter.name.text, forwarded);
      return;
    }
    const node = typeArg ?? typeParameter.default;
    if (!node) {
      throw new GenerateMetadataError(`Could not find a value for type parameter ${typeParameter.name.text}`, reference);
    }
    substitutions.set(typeParameter.name.text, { node, name: namer.typeName(node, outer.substitutions), scope: outer.substitutions });
  });
  return substitutions;
}
