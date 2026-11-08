import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { getJSDocTagNames, isExistJSDocTag } from '../../utils/jsDocUtils';
import { GenerateMetadataError } from '../exceptions';
import { getInitializerValue } from '../initializer-value';
import { readAnnotations, type Annotations } from './annotations';
import type { TypeResolver } from './typeResolver';
import { modelDeclarations } from './declarations';
import { resolveNamedModel } from './models';
import { isSymbolKeyed, syntheticOrigin, unionOf } from './internals';
import { writtenType } from './written';
import { childSite, declarationSite, emptySubstitutions, followSite, substitutionsCover, substitutionsFor, withNode, type PathStep, type Site } from './site';

export type Owner = ts.InterfaceDeclaration | ts.ClassDeclaration;
type Member = ts.PropertySignature | ts.PropertyDeclaration | ts.ParameterDeclaration;

/** A property as written in some declaration, with the site of its owner (whose substitutions its type nodes are read under). */
interface WrittenMember {
  name: string;
  member: Member;
  owner: Site;
}

/**
 * An object type that is not a named model. Written type literals keep their (reverse) member
 * order; types with no written form (or written as mapped types) take the checker's properties.
 */
export function resolveAnonymousObject(resolver: TypeResolver, type: ts.Type, site: Site): Tsoa.NestedObjectLiteralType {
  const node = followSite(site).node;
  if (node && ts.isTypeLiteralNode(node)) {
    const members = namedMembers(resolver, node.members.filter(ts.isPropertySignature), site);
    const index = node.members.find(ts.isIndexSignatureDeclaration);
    return {
      additionalProperties: index ? indexSignatureType(resolver, index, type, site) : undefined,
      dataType: 'nestedObjectLiteral',
      properties: writtenLiteralOrder(members.map(written => declaredProperty(resolver, type, written))),
    };
  }

  const checker = resolver.generator.typeChecker;
  const mapped = node !== undefined && ts.isMappedTypeNode(node);
  // Written mapped types drop non-property members and @ignore; unwritten
  // object types drop methods and accessors.
  const properties = checker
    .getPropertiesOfType(type)
    .filter(property => !isSymbolKeyed(property) && (mapped ? !isIgnoredMapped(property) : !(property.flags & (ts.SymbolFlags.Method | ts.SymbolFlags.Accessor))))
    .map(property => mappedProperty(resolver, property, site));
  const result: Tsoa.NestedObjectLiteralType = {
    dataType: 'nestedObjectLiteral',
    properties: mapped ? properties : printedLiteralOrder(properties),
  };
  const indexTypes = checker
    .getIndexInfosOfType(type)
    .filter(info => !(info.type.flags & ts.TypeFlags.Never))
    .map(info => resolver.resolve(info.type, childSite(site, undefined)));
  if (indexTypes.length) {
    result.additionalProperties = indexTypes.length === 1 ? indexTypes[0] : { dataType: 'union', types: indexTypes };
  }
  return result;
}

/**
 * Inherited properties first (heritage clause order), then the declaration's own. Interface and
 * class bases are read member by member against the derived type, so a base that is still being
 * built (a cycle) cannot leave properties out. Other bases (aliases such as `Partial<X>`) are
 * resolved as models without being registered, and their properties are taken.
 */
export function modelProperties(resolver: TypeResolver, declaration: Owner, ownerType: ts.Type, site: Site): Tsoa.Property[] {
  const checker = resolver.generator.typeChecker;
  const own = namedMembers(resolver, ownMembers(declaration), site).map(written => declaredProperty(resolver, ownerType, written));
  // A property declared again further down (by the owner, or an earlier base) is listed once.
  const seen = new Set(own.map(property => property.name));
  const unseen = (properties: Tsoa.Property[]) => {
    const added = properties.filter(property => !seen.has(property.name));
    added.forEach(property => seen.add(property.name));
    return added;
  };
  const clauses: readonly ts.HeritageClause[] = declaration.heritageClauses ?? [];
  const inherited = clauses.flatMap(clause =>
    clause.types.flatMap((heritage): Tsoa.Property[] => {
      const bases = modelDeclarations(resolver.generator, heritage.expression as ts.EntityName);
      const owners = bases.filter((base): base is Owner => ts.isInterfaceDeclaration(base) || ts.isClassDeclaration(base));
      if (owners.length) {
        return unseen(owners.flatMap(base => modelProperties(resolver, base, ownerType, declarationSite(site, undefined, base, substitutionsFor(heritage, base.typeParameters, site.substitutions)))));
      }
      const heritageSite = declarationSite(site, heritage, undefined, site.substitutions);
      const baseType = writtenType(checker, heritageSite);
      if (baseType) {
        const base = resolveNamedModel(resolver, baseType, heritageSite);
        return unseen(base ? propertiesOf(base) : []);
      }
      // A base that mentions the owner's type parameters (`interface Both<T> extends Patch<T>`).
      // An alias of a written object type contributes its written members, read with the base's
      // own type arguments, as the same alias does when it is not generic.
      const alias = bases.find(ts.isTypeAliasDeclaration);
      if (alias && ts.isTypeLiteralNode(alias.type)) {
        const aliasSite = declarationSite(site, undefined, alias, substitutionsFor(heritage, alias.typeParameters, site.substitutions));
        const members = namedMembers(resolver, alias.type.members.filter(ts.isPropertySignature), aliasSite).filter(written => !seen.has(written.name));
        return unseen(writtenLiteralOrder(members.map(written => declaredProperty(resolver, ownerType, written))));
      }
      // Otherwise the base's own declared type says which properties it contributes, and the
      // owner's instantiated type gives their types.
      const contributed = new Set(checker.getPropertiesOfType(checker.getTypeAtLocation(heritage)).map(property => property.getName()));
      const properties = checker
        .getPropertiesOfType(ownerType)
        .filter(property => contributed.has(property.getName()) && !seen.has(property.getName()) && !isSymbolKeyed(property) && !isIgnoredMapped(property))
        .map(property => mappedProperty(resolver, property, declarationSite(site, undefined, undefined, emptySubstitutions)));
      return unseen(properties);
    }),
  );
  return [...inherited, ...own];
}

function propertiesOf(type: Tsoa.Type): Tsoa.Property[] {
  if (type.dataType === 'refAlias') {
    return propertiesOf(type.type);
  }
  return type.dataType === 'refObject' || type.dataType === 'nestedObjectLiteral' ? (type.properties ?? []) : [];
}

/** The declared members that become properties. */
function ownMembers(declaration: Owner): Member[] {
  const ignored = (member: ts.Node) => isExistJSDocTag(member, tag => tag.tagName.text === 'ignore') || (member.flags & ts.NodeFlags.ThisNodeHasError) > 0;
  if (ts.isInterfaceDeclaration(declaration)) {
    return declaration.members.filter((member): member is ts.PropertySignature => !ignored(member) && ts.isPropertySignature(member));
  }
  const fields = declaration.members.filter(
    (member): member is ts.PropertyDeclaration => !ignored(member) && ts.isPropertyDeclaration(member) && !hasModifier(member, ts.SyntaxKind.StaticKeyword) && isPublic(member),
  );
  const constructor = declaration.members.find(ts.isConstructorDeclaration);
  const parameters = constructor ? constructor.parameters.filter(isParameterProperty) : [];
  return [...fields, ...parameters];
}

/** A property declared in an interface, class or type literal. */
function declaredProperty(resolver: TypeResolver, ownerType: ts.Type, { name, member, owner }: WrittenMember): Tsoa.Property {
  const checker = resolver.generator.typeChecker;
  const initializer = ts.isPropertyDeclaration(member) || ts.isParameter(member) ? member.initializer : undefined;
  const required = !member.questionToken && !initializer;
  const symbol = checker.getPropertyOfType(ownerType, name);
  const site = declarationSite(owner, member.type, member, owner.substitutions, { segment: name, declaration: symbol?.valueDeclaration ?? member });

  // The declared type: what the written type denotes, else the checker's property type without
  // the `undefined` an optional marker adds. `required` already says the property is optional.
  const type = writtenType(checker, site) ?? withoutOptionality(resolver, member, symbol ? checker.getTypeOfSymbol(symbol) : checker.getTypeAtLocation(member));
  const annotations = readAnnotations(member, resolver.generator);
  return property(resolver, name, required, resolver.resolve(type, site), annotations, annotations.description, initializer);
}

/** A property of a mapped or otherwise unwritten object type. Its docs come from the declaration it was mapped from, if any. */
function mappedProperty(resolver: TypeResolver, symbol: ts.Symbol, site: Site): Tsoa.Property {
  const checker = resolver.generator.typeChecker;
  const name = symbol.getName();
  const origin = originDeclaration(symbol);
  const propertyType = withoutMissing(checker, checker.getTypeOfSymbol(symbol));
  const hintSite = mappedHint(resolver, origin, propertyType, site, { segment: name, declaration: origin });
  const comments = symbol.getDocumentationComment(checker);
  return property(
    resolver,
    name,
    !(symbol.flags & ts.SymbolFlags.Optional),
    resolver.resolve(propertyType, hintSite),
    origin ? readAnnotations(origin, resolver.generator) : undefined,
    comments.length ? ts.displayPartsToString(comments) : undefined,
    origin && (origin as { initializer?: ts.Expression }).initializer,
  );
}

/** A property's metadata from its resolved type and its docs; an initializer's value wins over `@default`. */
function property(
  resolver: TypeResolver,
  name: string,
  required: boolean,
  type: Tsoa.Type,
  annotations: Annotations | undefined,
  description: string | undefined,
  initializer: ts.Expression | undefined,
): Tsoa.Property {
  const initialValue = initializer ? getInitializerValue(initializer, resolver.generator.typeChecker) : undefined;
  return {
    default: initialValue !== undefined ? initialValue : annotations?.default,
    description,
    example: annotations?.example,
    format: annotations?.format,
    name,
    required,
    type,
    validators: annotations?.validators ?? {},
    deprecated: annotations?.deprecated ?? false,
    title: annotations?.title,
    extensions: annotations?.extensions,
  };
}

/**
 * Under exactOptionalPropertyTypes an optional property's type holds the checker's `missing` type,
 * an `undefined` that the optional marker already says and the printer leaves out. It is
 * a different type from the `undefined` a source writes, which stays.
 */
function withoutMissing(checker: ts.TypeChecker, type: ts.Type): ts.Type {
  const undefinedType = checker.getUndefinedType();
  return withoutMembers(checker, type, member => (member.flags & ts.TypeFlags.Undefined) !== 0 && member !== undefinedType);
}

/** The union without the members `drop` selects, rebuilt as the checker would build it. */
function withoutMembers(checker: ts.TypeChecker, type: ts.Type, drop: (member: ts.Type) => boolean): ts.Type {
  if (!type.isUnion()) {
    return type;
  }
  const members = type.types.filter(member => !drop(member));
  if (members.length === type.types.length) {
    return type;
  }
  return members.length === 1 ? members[0] : (unionOf(checker, members) ?? type);
}

/**
 * The original declaration's written type is a hint for a mapped property only when it names
 * exactly the property's type (e.g. `id: UUID` through `Omit`); mapped types may transform types.
 */
function mappedHint(resolver: TypeResolver, origin: ts.Declaration | undefined, propertyType: ts.Type, site: Site, step: PathStep): Site {
  const written = origin && (origin as { type?: ts.TypeNode }).type;
  const hint = declarationSite(site, written, origin, site.substitutions, step);
  const usable = written && ts.isTypeReferenceNode(written) && substitutionsCover(origin, site.substitutions) && writtenType(resolver.generator.typeChecker, hint) === propertyType;
  return usable ? hint : withNode(hint, undefined);
}

function originDeclaration(property: ts.Symbol): ts.Declaration | undefined {
  return property.declarations?.[0] ?? syntheticOrigin(property)?.declarations?.[0];
}

/** Methods, accessors and `@ignore`d members are not properties. */
function isIgnoredMapped(property: ts.Symbol): boolean {
  const declaration = originDeclaration(property);
  return (
    declaration !== undefined &&
    (getJSDocTagNames(declaration).some(tag => tag === 'ignore') || (!ts.isPropertyDeclaration(declaration) && !ts.isPropertySignature(declaration) && !ts.isParameter(declaration)))
  );
}

export function toJSONReturn(resolver: TypeResolver, type: ts.Type, declaration: Owner, site: Site): Tsoa.Type | undefined {
  const checker = resolver.generator.typeChecker;
  const toJSON = checker.getPropertyOfType(type, 'toJSON');
  const method = toJSON?.valueDeclaration;
  if (!toJSON || !method || !(ts.isMethodDeclaration(method) || ts.isMethodSignature(method))) {
    return undefined;
  }
  // An optional `toJSON?()` is `(() => R) | undefined` under strictNullChecks.
  const signature = checker.getSignaturesOfType(checker.getNonNullableType(checker.getTypeOfSymbol(toJSON)), ts.SignatureKind.Call)[0];
  if (!signature) {
    return undefined;
  }
  const substitutions = method.parent === declaration ? site.substitutions : emptySubstitutions;
  return resolver.resolve(checker.getReturnTypeOfSignature(signature), declarationSite(site, method.type, undefined, substitutions));
}

export function ownIndexSignature(resolver: TypeResolver, declaration: ts.InterfaceDeclaration, type: ts.Type, site: Site): Tsoa.Type | undefined {
  const index = declaration.members.find(ts.isIndexSignatureDeclaration);
  return index ? indexSignatureType(resolver, index, type, site) : undefined;
}

function indexSignatureType(resolver: TypeResolver, index: ts.IndexSignatureDeclaration, type: ts.Type, site: Site): Tsoa.Type {
  const checker = resolver.generator.typeChecker;
  const keyNode = index.parameters[0].type;
  const keyType = keyNode ? checker.getTypeFromTypeNode(keyNode) : undefined;
  if (!keyType || !(keyType.flags & ts.TypeFlags.String)) {
    throw new GenerateMetadataError(`Only string indexers are supported.`, site.node);
  }
  const info = checker.getIndexInfosOfType(type).find(candidate => candidate.keyType.flags & ts.TypeFlags.String);
  const valueType = info ? info.type : checker.getTypeFromTypeNode(index.type);
  return resolver.resolve(valueType, childSite(site, index.type));
}

/**
 * Removes the `undefined` the checker adds to an optional property's type. Under
 * exactOptionalPropertyTypes that is the checker's `missing` type; otherwise it is plain
 * `undefined`, added only when the declared type does not already include it.
 */
function withoutOptionality(resolver: TypeResolver, member: Member, type: ts.Type): ts.Type {
  const checker = resolver.generator.typeChecker;
  if (!member.questionToken || !type.isUnion()) {
    return type;
  }
  if (resolver.generator.compilerOptions.exactOptionalPropertyTypes) {
    return withoutMissing(checker, type);
  }
  const declared = member.type ? checker.getTypeFromTypeNode(member.type) : undefined;
  const declaresUndefined = declared !== undefined && (declared.isUnion() ? declared.types : [declared]).some(t => t.flags & ts.TypeFlags.Undefined);
  if (declaresUndefined) {
    return type;
  }
  return withoutMembers(checker, type, member => (member.flags & ts.TypeFlags.Undefined) !== 0);
}

/** Members with a JSON property name; symbol-keyed members have none and are left out. */
function namedMembers(resolver: TypeResolver, members: Member[], owner: Site): WrittenMember[] {
  return members.flatMap(member => {
    const name = propertyName(resolver, member);
    return name === undefined ? [] : [{ name, member, owner }];
  });
}

/** Computed names use their value: property accesses (enum members) or string and number literal types. */
function propertyName(resolver: TypeResolver, member: Member): string | undefined {
  if (!ts.isComputedPropertyName(member.name)) {
    return (member.name as ts.Identifier).text;
  }
  const checker = resolver.generator.typeChecker;
  if (ts.isPropertyAccessExpression(member.name.expression)) {
    const value = getInitializerValue(member.name.expression, checker);
    if (value) {
      return value.toString();
    }
  }
  const type = checker.getTypeAtLocation(member.name.expression);
  return type.isStringLiteral() || type.isNumberLiteral() ? String(type.value) : undefined;
}

function hasModifier(node: ts.HasModifiers, kind: ts.SyntaxKind): boolean {
  return (ts.getModifiers(node) ?? []).some(modifier => modifier.kind === kind);
}

function isPublic(node: ts.HasModifiers): boolean {
  return !hasModifier(node, ts.SyntaxKind.ProtectedKeyword) && !hasModifier(node, ts.SyntaxKind.PrivateKeyword);
}

/** Parameter properties: `public`, or `readonly` without `private`/`protected`. */
function isParameterProperty(parameter: ts.ParameterDeclaration): boolean {
  if (hasModifier(parameter, ts.SyntaxKind.PublicKeyword)) {
    return true;
  }
  return hasModifier(parameter, ts.SyntaxKind.ReadonlyKeyword) && isPublic(parameter);
}

// Output kept as tsoa has always written it. A later cleanup can drop these in one place.

/** Members of a written type literal are listed last to first. */
function writtenLiteralOrder(properties: Tsoa.Property[]): Tsoa.Property[] {
  return properties.reverse();
}

/** Properties of an object type with no written form are listed last to first, as the checker prints them. */
function printedLiteralOrder(properties: Tsoa.Property[]): Tsoa.Property[] {
  return properties.reverse();
}
