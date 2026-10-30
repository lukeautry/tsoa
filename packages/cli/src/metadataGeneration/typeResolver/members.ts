import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { getJSDocTagNames, isExistJSDocTag } from '../../utils/jsDocUtils';
import { GenerateMetadataError } from '../exceptions';
import { getInitializerValue } from '../initializer-value';
import { readAnnotations } from './annotations';
import type { TypeResolver } from './typeResolver';
import { modelDeclarations } from './declarations';
import { resolveNamedReference } from './models';
import { syntheticOrigin, unionOf } from './internals';
import { writtenType } from './written';
import { childSite, emptySubstitutions, followSite, substitutionsCover, substitutionsFor, type Site, type Substitutions } from './site';

type Owner = ts.InterfaceDeclaration | ts.ClassDeclaration;
type Member = ts.PropertySignature | ts.PropertyDeclaration | ts.ParameterDeclaration;

/** A property as written in some declaration, with the substitutions its type nodes are read under. */
interface WrittenMember {
  name: string;
  member: Member;
  substitutions: Substitutions;
}

/**
 * The model for one interface or class declaration: `toJSON` wins;
 * otherwise inherited properties (heritage clause order), then own properties.
 */
export function resolveModel(resolver: TypeResolver, declaration: Owner, type: ts.Type, refName: string, site: Site): Tsoa.ReferenceType {
  const annotations = readAnnotations(declaration, resolver.generator);
  const header = {
    refName,
    description: annotations.description,
    deprecated: annotations.deprecated,
    ...(annotations.example !== undefined ? { example: annotations.example } : {}),
    ...(annotations.title ? { title: annotations.title } : {}),
  };

  const toJSON = toJSONReturn(resolver, type, declaration, site);
  if (toJSON) {
    return { dataType: 'refAlias', ...header, type: toJSON, validators: {} };
  }

  const properties = modelProperties(resolver, declaration, type, site.substitutions);
  return {
    additionalProperties: ts.isInterfaceDeclaration(declaration) ? ownIndexSignature(resolver, declaration, type, site) : undefined,
    dataType: 'refObject',
    ...header,
    properties,
  };
}

/**
 * An object type that is not a named model. Written type literals keep their (reverse) member
 * order; types with no written form (or written as mapped types) take the checker's properties.
 */
export function resolveAnonymousObject(resolver: TypeResolver, type: ts.Type, site: Site): Tsoa.NestedObjectLiteralType {
  const node = followSite(site).node;
  if (node && ts.isTypeLiteralNode(node)) {
    const members = namedMembers(resolver, node.members.filter(ts.isPropertySignature), site.substitutions);
    const index = node.members.find(ts.isIndexSignatureDeclaration);
    return {
      additionalProperties: index ? indexSignatureType(resolver, index, type, site) : undefined,
      dataType: 'nestedObjectLiteral',
      properties: members.map(written => declaredProperty(resolver, type, written)).reverse(),
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
    properties: mapped ? properties : properties.reverse(),
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
function modelProperties(resolver: TypeResolver, declaration: Owner, ownerType: ts.Type, substitutions: Substitutions): Tsoa.Property[] {
  const checker = resolver.generator.typeChecker;
  const own = namedMembers(resolver, ownMembers(declaration), substitutions).map(written => declaredProperty(resolver, ownerType, written));
  const seen = new Set(own.map(property => property.name));
  const clauses: readonly ts.HeritageClause[] = declaration.heritageClauses ?? [];
  const inherited = clauses.flatMap(clause =>
    clause.types.flatMap((heritage): Tsoa.Property[] => {
      const bases = modelDeclarations(checker, heritage.expression as ts.EntityName);
      const owners = bases.filter((base): base is Owner => ts.isInterfaceDeclaration(base) || ts.isClassDeclaration(base));
      if (owners.length) {
        const properties = owners.flatMap(base => modelProperties(resolver, base, ownerType, substitutionsFor(heritage, base.typeParameters, { substitutions }, resolver.namer)));
        properties.forEach(property => seen.add(property.name));
        return properties;
      }
      const site: Site = { node: heritage, declaration: undefined, substitutions };
      const baseType = writtenType(checker, site);
      if (baseType) {
        const base = resolveNamedReference(resolver, baseType, site, resolveModel, false);
        const properties = base ? propertiesOf(base) : [];
        properties.forEach(property => seen.add(property.name));
        return properties;
      }
      // A base that mentions the owner's type parameters (`interface Both<T> extends Patch<T>`).
      // An alias of a written object type contributes its written members, read with the base's
      // own type arguments, as the same alias does when it is not generic.
      const alias = bases.find(ts.isTypeAliasDeclaration);
      if (alias && ts.isTypeLiteralNode(alias.type)) {
        const baseSubstitutions = substitutionsFor(heritage, alias.typeParameters, { substitutions }, resolver.namer);
        const properties = namedMembers(resolver, alias.type.members.filter(ts.isPropertySignature), baseSubstitutions)
          .filter(written => !seen.has(written.name))
          .map(written => declaredProperty(resolver, ownerType, written))
          .reverse();
        properties.forEach(property => seen.add(property.name));
        return properties;
      }
      // Otherwise the base's own declared type says which properties it contributes, and the
      // owner's instantiated type gives their types.
      const contributed = new Set(checker.getPropertiesOfType(checker.getTypeAtLocation(heritage)).map(property => property.getName()));
      const properties = checker
        .getPropertiesOfType(ownerType)
        .filter(property => contributed.has(property.getName()) && !seen.has(property.getName()) && !isSymbolKeyed(property) && !isIgnoredMapped(property))
        .map(property => mappedProperty(resolver, property, { node: undefined, declaration: undefined, substitutions: emptySubstitutions }));
      properties.forEach(property => seen.add(property.name));
      return properties;
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
function declaredProperty(resolver: TypeResolver, ownerType: ts.Type, { name, member, substitutions }: WrittenMember): Tsoa.Property {
  const checker = resolver.generator.typeChecker;
  const annotations = readAnnotations(member, resolver.generator);
  const isClassMember = ts.isPropertyDeclaration(member) || ts.isParameter(member);
  const initializer = isClassMember ? member.initializer : undefined;
  const required = !member.questionToken && !initializer;
  const site: Site = { node: member.type, declaration: member, substitutions };

  // The declared type: what the written type denotes, else the checker's property type without
  // the `undefined` an optional marker adds. `required` already says the property is optional.
  const symbol = checker.getPropertyOfType(ownerType, name);
  const type = writtenType(checker, site) ?? withoutOptionality(resolver, member, symbol ? checker.getTypeOfSymbol(symbol) : checker.getTypeAtLocation(member));
  const resolved = resolver.at(name, () => resolver.resolve(type, site), symbol?.valueDeclaration ?? member);

  const initialValue = initializer ? getInitializerValue(initializer, checker) : undefined;
  return {
    default: initialValue !== undefined ? initialValue : annotations.default,
    description: annotations.description,
    example: annotations.example,
    format: annotations.format,
    name,
    required,
    type: resolved,
    validators: annotations.validators,
    deprecated: isClassMember ? annotations.deprecated : isExistJSDocTag(member, tag => tag.tagName.text === 'deprecated'),
    title: annotations.title,
    extensions: annotations.extensions,
  };
}

/** A property of a mapped or otherwise unwritten object type. */
function mappedProperty(resolver: TypeResolver, property: ts.Symbol, site: Site): Tsoa.Property {
  const checker = resolver.generator.typeChecker;
  const origin = originDeclaration(property);
  const annotations = origin ? readAnnotations(origin, resolver.generator) : undefined;
  const propertyType = withoutMissing(checker, checker.getTypeOfSymbol(property));
  const hintSite = mappedHint(resolver, origin, propertyType, site);
  const initializer = origin && (origin as { initializer?: ts.Expression }).initializer;
  const comments = property.getDocumentationComment(checker);
  return {
    name: property.getName(),
    required: !(property.flags & ts.SymbolFlags.Optional),
    deprecated: annotations?.deprecated ?? false,
    type: resolver.at(property.getName(), () => resolver.resolve(propertyType, hintSite), origin),
    default: initializer ? getInitializerValue(initializer, checker) : annotations?.default,
    validators: annotations?.validators ?? {},
    description: comments.length ? ts.displayPartsToString(comments) : undefined,
    format: annotations?.format,
    example: annotations?.example,
    extensions: annotations?.extensions,
  };
}

/**
 * Under exactOptionalPropertyTypes an optional property's type holds the checker's `missing` type,
 * an `undefined` that the optional marker already says and the printer leaves out. It is
 * a different type from the `undefined` a source writes, which stays.
 */
function withoutMissing(checker: ts.TypeChecker, type: ts.Type): ts.Type {
  if (!type.isUnion()) {
    return type;
  }
  const undefinedType = checker.getUndefinedType();
  const members = type.types.filter(member => !(member.flags & ts.TypeFlags.Undefined) || member === undefinedType);
  if (members.length === type.types.length) {
    return type;
  }
  return members.length === 1 ? members[0] : (unionOf(checker, members) ?? type);
}

/**
 * The original declaration's written type is a hint for a mapped property only when it names
 * exactly the property's type (e.g. `id: UUID` through `Omit`); mapped types may transform types.
 */
function mappedHint(resolver: TypeResolver, origin: ts.Declaration | undefined, propertyType: ts.Type, site: Site): Site {
  const written = origin && (origin as { type?: ts.TypeNode }).type;
  const hint: Site = { node: written, declaration: origin, substitutions: site.substitutions };
  const usable = written && ts.isTypeReferenceNode(written) && substitutionsCover(origin, site.substitutions) && writtenType(resolver.generator.typeChecker, hint) === propertyType;
  return usable ? hint : { ...hint, node: undefined };
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

function toJSONReturn(resolver: TypeResolver, type: ts.Type, declaration: Owner, site: Site): Tsoa.Type | undefined {
  const checker = resolver.generator.typeChecker;
  const toJSON = checker.getPropertyOfType(type, 'toJSON');
  const method = toJSON?.valueDeclaration;
  if (!toJSON || !method || !(ts.isMethodDeclaration(method) || ts.isMethodSignature(method))) {
    return undefined;
  }
  const signature = checker.getSignaturesOfType(checker.getTypeOfSymbol(toJSON), ts.SignatureKind.Call)[0];
  const substitutions = method.parent === declaration ? site.substitutions : new Map();
  return resolver.resolve(checker.getReturnTypeOfSignature(signature), { node: method.type, declaration: undefined, substitutions });
}

function ownIndexSignature(resolver: TypeResolver, declaration: ts.InterfaceDeclaration, type: ts.Type, site: Site): Tsoa.Type | undefined {
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
  return resolver.resolve(valueType, { node: index.type, declaration: site.declaration, substitutions: site.substitutions });
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
  const members = type.types.filter(t => !(t.flags & ts.TypeFlags.Undefined));
  return members.length === 1 ? members[0] : (unionOf(checker, members) ?? type);
}

/** Members with a JSON property name; symbol-keyed members have none and are left out. */
function namedMembers(resolver: TypeResolver, members: Member[], substitutions: Substitutions): WrittenMember[] {
  return members.flatMap(member => {
    const name = propertyName(resolver, member);
    return name === undefined ? [] : [{ name, member, substitutions }];
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

/** Properties keyed by a symbol (`[Symbol.iterator]`, `unique symbol` constants) have no JSON name. */
function isSymbolKeyed(property: ts.Symbol): boolean {
  return (property.escapedName as string).startsWith('__@');
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
