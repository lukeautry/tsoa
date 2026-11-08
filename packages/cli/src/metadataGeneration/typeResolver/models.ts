import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { isExistJSDocTag } from '../../utils/jsDocUtils';
import { getPropertyValidators } from '../../utils/validatorUtils';
import { GenerateMetadataError } from '../exceptions';
import { nodeDefault, nodeDescription, nodeExample, nodeFormat, nodeTitle, readAnnotations } from './annotations';
import { modelProperties, ownIndexSignature, toJSONReturn, type Owner } from './members';
import type { MetadataGenerator } from '../metadataGenerator';
import type { TypeResolver } from './typeResolver';
import { modelDeclarations } from './declarations';
import { aliasBodySite, declarationSite, emptySubstitutions, substitutionsFor, type Site } from './site';

/**
 * A reference to a named model, added to the metadata: a written reference with model
 * declarations, or — when the type has no written form — the reference the checker would print
 * for it. Returns undefined for anything that is not a named model.
 */
export function resolveNamedReference(resolver: TypeResolver, type: ts.Type, site: Site): Tsoa.ReferenceType | undefined {
  const named = namedModel(resolver, type, site);
  return named && resolver.registry.reference(named.refName, type, named.build);
}

/** The same model, built and cached but not added to the metadata (how heritage bases are read). */
export function resolveNamedModel(resolver: TypeResolver, type: ts.Type, site: Site): Tsoa.ReferenceType | undefined {
  const named = namedModel(resolver, type, site);
  return named && resolver.registry.model(named.refName, type, named.build);
}

function namedModel(resolver: TypeResolver, type: ts.Type, site: Site): { refName: string; build: () => Tsoa.ReferenceType } | undefined {
  const written = site.node;
  const node = written ?? resolver.generator.typeChecker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.NoTruncation);
  if (!node || !(ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node)) || isStructuralArray(node)) {
    return undefined;
  }

  const substitutions = written ? site.substitutions : emptySubstitutions;
  const reference = resolver.namer.referenceName(node, substitutions);
  if (reference.declarations.length === 0) {
    return undefined;
  }
  // Expanding an alias's own body must not name that body after the alias again; a nested
  // reference to the alias (`type Tree<T> = T | Tree<T>[]`) is a model reference like any other.
  if (!written && site.aliasBody && (reference.declarations as ts.Node[]).includes(site.aliasBody)) {
    return undefined;
  }

  const build = () => {
    const models = reference.declarations.map(declaration => {
      const typeParameters = 'typeParameters' in declaration ? declaration.typeParameters : undefined;
      const inner = declarationSite(site, undefined, declaration, substitutionsFor(node, typeParameters, substitutions));
      if (ts.isTypeAliasDeclaration(declaration)) {
        const { alias, site: aliasSite } = followReexports(resolver, declaration, inner);
        return aliasModel(resolver, alias, type, reference.refName, aliasBodySite(aliasSite, alias));
      }
      if (ts.isEnumDeclaration(declaration) || ts.isEnumMember(declaration)) {
        return enumModel(resolver, declaration, reference.refName);
      }
      return objectModel(resolver, declaration, type, reference.refName, inner, site);
    });
    return mergeModels(models);
  };
  return { refName: reference.refName, build };
}

/**
 * The model for one interface or class declaration: `toJSON` wins;
 * otherwise admission at the outer source site, then inherited and own properties at the declaration site.
 */
function objectModel(resolver: TypeResolver, declaration: Owner, type: ts.Type, refName: string, site: Site, outerSite: Site): Tsoa.ReferenceType {
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

  resolver.assertSupportedObject(type, outerSite);
  const properties = modelProperties(resolver, declaration, type, site);
  return {
    additionalProperties: ts.isInterfaceDeclaration(declaration) ? ownIndexSignature(resolver, declaration, type, site) : undefined,
    dataType: 'refObject',
    ...header,
    properties,
  };
}

/**
 * Follows aliases that only re-export another alias of the same name with the same type parameters
 * (zod's `type input<T> = core.input<T>`), so the written name is the only model and the two
 * declarations sharing one name are not reported as a conflict.
 */
function followReexports(resolver: TypeResolver, alias: ts.TypeAliasDeclaration, site: Site): { alias: ts.TypeAliasDeclaration; site: Site } {
  for (;;) {
    const target = reexportedAlias(resolver.generator, alias);
    if (!target) {
      return { alias, site };
    }
    site = declarationSite(site, undefined, target, substitutionsFor(alias.type as ts.TypeReferenceNode, target.typeParameters, site.substitutions));
    alias = target;
  }
}

function reexportedAlias(generator: MetadataGenerator, alias: ts.TypeAliasDeclaration): ts.TypeAliasDeclaration | undefined {
  const body = alias.type;
  const parameters = alias.typeParameters;
  if (!parameters?.length || !ts.isTypeReferenceNode(body) || body.typeArguments?.length !== parameters.length) {
    return undefined;
  }
  const forwardsParameters = body.typeArguments.every((arg, i) => ts.isTypeReferenceNode(arg) && !arg.typeArguments && ts.isIdentifier(arg.typeName) && arg.typeName.text === parameters[i].name.text);
  const targetName = ts.isIdentifier(body.typeName) ? body.typeName.text : body.typeName.right.text;
  if (!forwardsParameters || targetName !== alias.name.text) {
    return undefined;
  }
  const targets = modelDeclarations(generator, body.typeName);
  return targets.length === 1 && ts.isTypeAliasDeclaration(targets[0]) && targets[0] !== alias ? targets[0] : undefined;
}

/** `Array<T>` and `ReadonlyArray<T>` are arrays, not models. */
function isStructuralArray(node: ts.TypeReferenceType): boolean {
  return ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && (node.typeName.text === 'Array' || node.typeName.text === 'ReadonlyArray') && node.typeArguments?.length === 1;
}

function aliasModel(resolver: TypeResolver, declaration: ts.TypeAliasDeclaration, type: ts.Type, refName: string, site: Site): Tsoa.RefAliasType {
  const checker = resolver.generator.typeChecker;
  const example = nodeExample(checker, declaration);
  const title = nodeTitle(declaration);
  return {
    dataType: 'refAlias',
    default: nodeDefault(declaration),
    description: nodeDescription(checker, declaration.name),
    refName,
    format: nodeFormat(declaration),
    type: resolver.resolve(type, site),
    validators: getPropertyValidators(declaration) || {},
    deprecated: isExistJSDocTag(declaration, tag => tag.tagName.text === 'deprecated'),
    ...(example !== undefined ? { example } : {}),
    ...(title && { title }),
  };
}

function enumModel(resolver: TypeResolver, declaration: ts.EnumDeclaration | ts.EnumMember, refName: string): Tsoa.RefEnumType {
  const checker = resolver.generator.typeChecker;
  const deprecated = isExistJSDocTag(declaration, tag => tag.tagName.text === 'deprecated');
  if (ts.isEnumMember(declaration)) {
    return { dataType: 'refEnum', refName, enums: [constantValue(checker, declaration)], enumVarnames: [declaration.name.getText()], deprecated };
  }
  const title = nodeTitle(declaration);
  const members = declaration.members.filter(member => checker.getConstantValue(member) !== undefined);
  return {
    dataType: 'refEnum',
    description: nodeDescription(checker, declaration.name),
    example: nodeExample(checker, declaration),
    enums: members.map(member => constantValue(checker, member)),
    enumVarnames: declaration.members.map(member => member.name.getText()),
    refName,
    deprecated,
    ...(title && { title }),
  };
}

function constantValue(checker: ts.TypeChecker, member: ts.EnumMember): string | number {
  const value = checker.getConstantValue(member);
  if (value === undefined) {
    throw new GenerateMetadataError(`Could not determine the value of enum member ${member.name.getText()}`, member);
  }
  return value;
}

/** One model from the declarations that share a name (merged interfaces, an enum and its namespace…). */
export function mergeModels(models: Tsoa.ReferenceType[]): Tsoa.ReferenceType {
  if (models.length === 0) {
    throw new GenerateMetadataError('Cannot merge empty reference types array');
  }
  if (models.length === 1) {
    return models[0];
  }
  if (models.every((model): model is Tsoa.RefEnumType => model.dataType === 'refEnum')) {
    return mergeEnums(models);
  }
  if (models.every((model): model is Tsoa.RefObjectType => model.dataType === 'refObject')) {
    return mergeObjects(models);
  }
  throw new GenerateMetadataError(`These resolved type merge rules are not defined: ${JSON.stringify(models)}`);
}

export function mergeEnums(many: Tsoa.RefEnumType[]): Tsoa.RefEnumType {
  let merged = mergeEnum(many[0], many[1]);
  for (let i = 2; i < many.length; ++i) {
    merged = mergeEnum(merged, many[i]);
  }
  return merged;
}

export function mergeEnum(first: Tsoa.RefEnumType, second: Tsoa.RefEnumType): Tsoa.RefEnumType {
  if (!first) return second;
  if (!second) return first;

  const description = first.description ? (second.description ? `${first.description}\n${second.description}` : first.description) : second.description;
  const deprecated = first.deprecated || second.deprecated;
  const enums = first.enums ? (second.enums ? [...first.enums, ...second.enums] : first.enums) : second.enums;
  const enumVarnames = first.enumVarnames ? (second.enumVarnames ? [...first.enumVarnames, ...second.enumVarnames] : first.enumVarnames) : second.enumVarnames;
  const example = first.example ?? second.example;
  const title = first.title || second.title;

  return {
    dataType: 'refEnum',
    description,
    enums,
    enumVarnames,
    refName: first.refName,
    deprecated,
    example,
    ...(title && { title }),
  };
}

export function mergeObjects(many: Tsoa.RefObjectType[]): Tsoa.RefObjectType {
  let merged = mergeObject(many[0], many[1]);
  for (let i = 2; i < many.length; ++i) {
    merged = mergeObject(merged, many[i]);
  }
  return merged;
}

export function mergeObject(first: Tsoa.RefObjectType, second: Tsoa.RefObjectType): Tsoa.RefObjectType {
  const description = first.description ? (second.description ? `${first.description}\n${second.description}` : first.description) : second.description;
  const deprecated = first.deprecated || second.deprecated;
  const example = first.example ?? second.example;
  const properties = [...first.properties, ...second.properties.filter(prop => first.properties.every(firstProp => firstProp.name !== prop.name))];
  const additionalProperties = first.additionalProperties
    ? second.additionalProperties
      ? { dataType: 'union' as const, types: [first.additionalProperties, second.additionalProperties] }
      : first.additionalProperties
    : second.additionalProperties;
  const title = first.title || second.title;

  return {
    dataType: 'refObject',
    description,
    properties,
    additionalProperties,
    refName: first.refName,
    deprecated,
    example,
    ...(title && { title }),
  };
}
