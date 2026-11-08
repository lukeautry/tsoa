import * as ts from 'typescript';
import { GenerateMetadataError } from '../exceptions';

/**
 * Syntax that travels alongside a checker type. It never decides what a schema is; it only supplies
 * names (as written in source), JSDoc/decorator hints, and erased aliases. Sites are built only by
 * the constructors below.
 */
export interface Site {
  /** The type annotation at this position, if the type was written in source. */
  node?: ts.TypeNode;
  /** The declaration owning this position (property, parameter, alias), for JSDoc and decorator hints. */
  declaration?: ts.Node;
  /** Written type arguments for the type parameters in scope, keyed by type-parameter name. */
  substitutions: Substitutions;
  /** Where this position is, from the parameter name through properties and elements (`body.items[].tags`), for error messages. */
  path: readonly PathStep[];
  /** Set only on the site of an alias's own body; child sites never carry it. */
  aliasBody?: ts.TypeAliasDeclaration;
}

/** One step of a site's path, with the source declaration it came from, when there is one. */
export interface PathStep {
  segment: string;
  declaration?: ts.Node;
}

export interface Substitution {
  /** The written type argument (or default). */
  node: ts.TypeNode;
  /** The substitutions in scope where `node` was written. */
  scope: Substitutions;
  /** The generic declaration whose type parameter this binds. */
  owner: ts.Node;
}

export type Substitutions = ReadonlyMap<string, Substitution>;

export const emptySubstitutions: Substitutions = new Map();

/** Where resolution starts: a written type (or none) and the declaration it belongs to. A parameter starts the path with its name. */
export function rootSite(node?: ts.TypeNode, declaration?: ts.Node): Site {
  const path = declaration && ts.isParameter(declaration) && ts.isIdentifier(declaration.name) ? [{ segment: declaration.name.text, declaration }] : [];
  return { node, declaration, substitutions: emptySubstitutions, path };
}

/** One step down (an element, member or type argument), under the same substitutions. `step` extends the path. */
export function childSite(site: Site, node: ts.TypeNode | undefined, declaration?: ts.Node, step?: PathStep): Site {
  return { node, declaration: declaration ?? site.declaration, substitutions: site.substitutions, path: step ? [...site.path, step] : site.path };
}

/** A declaration's written type, read under that declaration's substitutions. `step` extends the path. */
export function declarationSite(site: Site, node: ts.TypeNode | undefined, declaration: ts.Node | undefined, substitutions: Substitutions, step?: PathStep): Site {
  return { node, declaration, substitutions, path: step ? [...site.path, step] : site.path };
}

/** The same position seen through another node (parentheses removed, a type argument followed, …). */
export function withNode(site: Site, node: ts.TypeNode | undefined, substitutions: Substitutions = site.substitutions): Site {
  return { ...site, node, substitutions };
}

/** The body of `alias`, which must not be named after `alias` again. */
export function aliasBodySite(site: Site, alias: ts.TypeAliasDeclaration): Site {
  return { ...site, node: alias.type, declaration: alias, aliasBody: alias };
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
      current = withNode(current, node.type);
      continue;
    }
    const substitution = node && ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) ? current.substitutions.get(node.typeName.text) : undefined;
    if (substitution && substitution.node !== node) {
      current = withNode(current, substitution.node, substitution.scope);
      continue;
    }
    return current;
  }
}

/**
 * Maps a generic declaration's type parameters to the arguments written at `reference`:
 * a forwarded type parameter, the argument, or the default. Written arguments are read in the
 * caller's scope (`outer`); a default is read in the declaration's own scope, so it can refer to
 * the parameters bound before it (`interface Pair<T = string, U = T>`).
 */
export function substitutionsFor(
  reference: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments,
  typeParameters: readonly ts.TypeParameterDeclaration[] | undefined,
  outer: Substitutions,
): Substitutions {
  const substitutions = new Map<string, Substitution>();
  (typeParameters ?? []).forEach((typeParameter, index) => {
    const typeArg = reference.typeArguments?.[index];
    const forwarded = typeArg && ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName) ? outer.get(typeArg.typeName.text) : undefined;
    if (forwarded) {
      substitutions.set(typeParameter.name.text, { ...forwarded, owner: typeParameter.parent });
      return;
    }
    const node = typeArg ?? typeParameter.default;
    if (!node) {
      throw new GenerateMetadataError(`Could not find a value for type parameter ${typeParameter.name.text}`, reference);
    }
    substitutions.set(typeParameter.name.text, { node, scope: typeArg ? outer : new Map(substitutions), owner: typeParameter.parent });
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
