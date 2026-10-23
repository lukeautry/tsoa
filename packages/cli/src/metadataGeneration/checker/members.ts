import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { getJSDocTagNames, isExistJSDocTag } from '../../utils/jsDocUtils';
import { GenerateMetadataError } from '../exceptions';
import { getInitializerValue } from '../initializer-value';
import { readAnnotations } from './annotations';
import type { CheckerTypeResolver } from './checkerTypeResolver';
import { modelDeclarations } from './declarations';
import { resolveNamedReference } from './models';
import { syntheticOrigin } from './internals';
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
 * The model for one interface or class declaration (legacy `getModelReference`): `toJSON` wins;
 * otherwise inherited properties (heritage clause order), then own properties.
 */
export function resolveModel(resolver: CheckerTypeResolver, declaration: Owner, type: ts.Type, refName: string, site: Site): Tsoa.ReferenceType {
  const annotations = readAnnotations(declaration, resolver.generator);
  const header = {
    refName,
    description: annotations.description,
    deprecated: annotations.deprecated,
    ...(annotations.example ? { example: annotations.example } : {}),
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
 * An object type that is not a named model. Written type literals keep legacy's (reverse) member
 * order; types with no written form (or written as mapped types) take the checker's properties.
 */
export function resolveAnonymousObject(resolver: CheckerTypeResolver, type: ts.Type, site: Site): Tsoa.NestedObjectLiteralType {
  const node = followSite(site).node;
  if (node && ts.isTypeLiteralNode(node)) {
    const members = node.members.filter(ts.isPropertySignature).map(member => ({ name: propertyName(resolver, member), member, substitutions: site.substitutions }));
    const index = node.members.find(ts.isIndexSignatureDeclaration);
    return {
      additionalProperties: index ? indexSignatureType(resolver, index, type, site) : undefined,
      dataType: 'nestedObjectLiteral',
      properties: members.map(written => declaredProperty(resolver, type, written)).reverse(),
    };
  }

  const checker = resolver.generator.typeChecker;
  const mapped = node !== undefined && ts.isMappedTypeNode(node);
  // Written mapped types drop non-property members and @ignore (legacy mapped branch); unwritten
  // object types drop methods and accessors, as legacy's printed type literal did.
  const properties = checker
    .getPropertiesOfType(type)
    .filter(property => (mapped ? !isIgnoredMapped(property) : !(property.flags & (ts.SymbolFlags.Method | ts.SymbolFlags.Accessor))))
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
 * resolved as models without being registered, and their properties are taken (legacy).
 */
function modelProperties(resolver: CheckerTypeResolver, declaration: Owner, ownerType: ts.Type, substitutions: Substitutions): Tsoa.Property[] {
  const checker = resolver.generator.typeChecker;
  const own = ownMembers(declaration).map(member => declaredProperty(resolver, ownerType, { name: propertyName(resolver, member), member, substitutions }));
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
      // A base that mentions the owner's type parameters (`interface Envelope<T> extends Patch<T>`):
      // its instantiated properties are the owner's properties not declared anywhere else.
      const properties = checker
        .getPropertiesOfType(ownerType)
        .filter(property => !seen.has(property.getName()) && !isIgnoredMapped(property))
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

/** Legacy PropertyTransformer member selection. */
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
function declaredProperty(resolver: CheckerTypeResolver, ownerType: ts.Type, { name, member, substitutions }: WrittenMember): Tsoa.Property {
  const checker = resolver.generator.typeChecker;
  const annotations = readAnnotations(member, resolver.generator);
  const isClassMember = ts.isPropertyDeclaration(member) || ts.isParameter(member);
  const initializer = isClassMember ? member.initializer : undefined;
  const required = !member.questionToken && !initializer;
  const site: Site = { node: member.type, declaration: member, substitutions };

  const symbol = checker.getPropertyOfType(ownerType, name);
  let type: ts.Type;
  if (member.type && member.type.pos !== -1 && substitutions.size === 0) {
    // The declared type, without the `undefined` strict mode adds to optional properties.
    type = checker.getTypeFromTypeNode(member.type);
  } else {
    type = symbol ? checker.getTypeOfSymbol(symbol) : checker.getTypeAtLocation(member);
  }
  const resolved =
    !required && member.type && type.isUnion() && !writesUndefined(member.type)
      ? resolver.resolveMembers(
          type.types.filter(t => !(t.flags & ts.TypeFlags.Undefined)),
          site,
        )
      : resolver.resolve(type, site);

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

/** A property of a mapped or otherwise unwritten object type (legacy mapped-type branch). */
function mappedProperty(resolver: CheckerTypeResolver, property: ts.Symbol, site: Site): Tsoa.Property {
  const checker = resolver.generator.typeChecker;
  const origin = originDeclaration(property);
  const annotations = origin ? readAnnotations(origin, resolver.generator) : undefined;
  const propertyType = checker.getTypeOfSymbol(property);
  const hintSite = mappedHint(resolver, origin, propertyType, site);
  const initializer = origin && (origin as { initializer?: ts.Expression }).initializer;
  const comments = property.getDocumentationComment(checker);
  return {
    name: property.getName(),
    required: !(property.flags & ts.SymbolFlags.Optional),
    deprecated: annotations?.deprecated ?? false,
    type: resolver.resolve(propertyType, hintSite),
    default: initializer ? getInitializerValue(initializer, checker) : annotations?.default,
    validators: annotations?.validators ?? {},
    description: comments.length ? ts.displayPartsToString(comments) : undefined,
    format: annotations?.format,
    example: annotations?.example,
    extensions: annotations?.extensions,
  };
}

/**
 * The original declaration's written type is a hint for a mapped property only when it names
 * exactly the property's type (e.g. `id: UUID` through `Omit`); mapped types may transform types.
 */
function mappedHint(resolver: CheckerTypeResolver, origin: ts.Declaration | undefined, propertyType: ts.Type, site: Site): Site {
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

function toJSONReturn(resolver: CheckerTypeResolver, type: ts.Type, declaration: Owner, site: Site): Tsoa.Type | undefined {
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

function ownIndexSignature(resolver: CheckerTypeResolver, declaration: ts.InterfaceDeclaration, type: ts.Type, site: Site): Tsoa.Type | undefined {
  const index = declaration.members.find(ts.isIndexSignatureDeclaration);
  return index ? indexSignatureType(resolver, index, type, site) : undefined;
}

function indexSignatureType(resolver: CheckerTypeResolver, index: ts.IndexSignatureDeclaration, type: ts.Type, site: Site): Tsoa.Type {
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

/** Optional properties carry an `undefined` in strict mode that the source did not write. */
function writesUndefined(written: ts.TypeNode | undefined): boolean {
  return written !== undefined && ts.isUnionTypeNode(written) && written.types.some(t => t.kind === ts.SyntaxKind.UndefinedKeyword);
}

/** Legacy `getPropertyName`: computed names that are property accesses use their value. */
function propertyName(resolver: CheckerTypeResolver, member: Member): string {
  if (ts.isComputedPropertyName(member.name) && ts.isPropertyAccessExpression(member.name.expression)) {
    const value = getInitializerValue(member.name.expression, resolver.generator.typeChecker);
    if (value) {
      return value.toString();
    }
  }
  return (member.name as ts.Identifier).text;
}

function hasModifier(node: ts.HasModifiers, kind: ts.SyntaxKind): boolean {
  return (ts.getModifiers(node) ?? []).some(modifier => modifier.kind === kind);
}

function isPublic(node: ts.HasModifiers): boolean {
  return !hasModifier(node, ts.SyntaxKind.ProtectedKeyword) && !hasModifier(node, ts.SyntaxKind.PrivateKeyword);
}

/** Legacy `isAccessibleParameter`: `public`, or `readonly` without `private`/`protected`. */
function isParameterProperty(parameter: ts.ParameterDeclaration): boolean {
  if (hasModifier(parameter, ts.SyntaxKind.PublicKeyword)) {
    return true;
  }
  return hasModifier(parameter, ts.SyntaxKind.ReadonlyKeyword) && isPublic(parameter);
}
