import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { isExistJSDocTag } from '../../utils/jsDocUtils';
import { getPropertyValidators } from '../../utils/validatorUtils';
import { GenerateMetadataError } from '../exceptions';
import { ReferenceTransformer } from '../transformer/referenceTransformer';
import { nodeDefault, nodeDescription, nodeExample, nodeFormat, nodeTitle } from './annotations';
import type { CheckerTypeResolver } from './checkerTypeResolver';
import { emptySubstitutions, substitutionsFor, type Site } from './site';

/** Builds the refObject (or toJSON refAlias) for an interface or class; provided by the member resolver. */
export type ModelBuilder = (resolver: CheckerTypeResolver, declaration: ts.InterfaceDeclaration | ts.ClassDeclaration, type: ts.Type, refName: string, site: Site) => Tsoa.ReferenceType;

/**
 * A reference to a named model: a written reference with model declarations, or — when the type
 * has no written form — the reference the checker would print for it (as legacy did).
 * Returns undefined for anything that is not a named model.
 */
export function resolveNamedReference(resolver: CheckerTypeResolver, type: ts.Type, site: Site, buildModel: ModelBuilder, register = true): Tsoa.ReferenceType | undefined {
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
  // An alias whose body evaluates to the alias itself must not name its own body.
  if (!written && site.declaration && (reference.declarations as ts.Node[]).includes(site.declaration)) {
    return undefined;
  }

  return resolver.registry.reference(
    reference.refName,
    type,
    () => {
      const outer: Site = { ...site, node, substitutions };
      const models = reference.declarations.map(declaration => {
        const typeParameters = 'typeParameters' in declaration ? declaration.typeParameters : undefined;
        const inner: Site = { node: undefined, declaration, substitutions: substitutionsFor(node, typeParameters, outer, resolver.namer) };
        if (ts.isTypeAliasDeclaration(declaration)) {
          return aliasModel(resolver, declaration, type, reference.refName, { ...inner, node: declaration.type });
        }
        if (ts.isEnumDeclaration(declaration) || ts.isEnumMember(declaration)) {
          return enumModel(resolver, declaration, reference.refName);
        }
        return buildModel(resolver, declaration, type, reference.refName, inner);
      });
      return ReferenceTransformer.merge(models);
    },
    register,
  );
}

/** `Array<T>` and `ReadonlyArray<T>` are arrays, not models (legacy). */
function isStructuralArray(node: ts.TypeReferenceType): boolean {
  return ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && (node.typeName.text === 'Array' || node.typeName.text === 'ReadonlyArray') && node.typeArguments?.length === 1;
}

function aliasModel(resolver: CheckerTypeResolver, declaration: ts.TypeAliasDeclaration, type: ts.Type, refName: string, site: Site): Tsoa.RefAliasType {
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

function enumModel(resolver: CheckerTypeResolver, declaration: ts.EnumDeclaration | ts.EnumMember, refName: string): Tsoa.RefEnumType {
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
