import type { TypeAliasDeclaration, Type } from 'typescript';
import { Tsoa } from '@tsoa/runtime';

import { Transformer } from './transformer';
import { EnumTransformer } from './enumTransformer';
import { TypeResolver } from '../typeResolver';
import { GenerateMetadataError } from '../exceptions';
import { getPropertyValidators } from '../../utils/validatorUtils';

export class ReferenceTransformer extends Transformer {
  public static merge(referenceTypes: Tsoa.ReferenceType[]): Tsoa.ReferenceType {
    if (referenceTypes.length === 0) {
      throw new GenerateMetadataError('Cannot merge empty reference types array');
    }

    if (referenceTypes.length === 1) {
      return referenceTypes[0];
    }

    if (referenceTypes.every(refType => refType.dataType === 'refEnum')) {
      /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
      return EnumTransformer.mergeMany(referenceTypes as Tsoa.RefEnumType[]);
    }

    if (referenceTypes.every(refType => refType.dataType === 'refObject')) {
      /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
      return this.mergeManyRefObj(referenceTypes as Tsoa.RefObjectType[]);
    }

    throw new GenerateMetadataError(`These resolved type merge rules are not defined: ${JSON.stringify(referenceTypes)}`);
  }

  public static mergeManyRefObj(many: Tsoa.RefObjectType[]): Tsoa.RefObjectType {
    let merged = this.mergeRefObj(many[0], many[1]);
    for (let i = 2; i < many.length; ++i) {
      merged = this.mergeRefObj(merged, many[i]);
    }
    return merged;
  }

  public static mergeRefObj(first: Tsoa.RefObjectType, second: Tsoa.RefObjectType): Tsoa.RefObjectType {
    const description = first.description ? (second.description ? `${first.description}\n${second.description}` : first.description) : second.description;

    const deprecated = first.deprecated || second.deprecated;
    const example = first.example || second.example;

    const properties = [...first.properties, ...second.properties.filter(prop => first.properties.every(firstProp => firstProp.name !== prop.name))];

    const mergeAdditionalTypes = (first: Tsoa.Type, second: Tsoa.Type): Tsoa.Type => {
      return {
        dataType: 'union',
        types: [first, second],
      };
    };

    const additionalProperties = first.additionalProperties
      ? second.additionalProperties
        ? mergeAdditionalTypes(first.additionalProperties, second.additionalProperties)
        : first.additionalProperties
      : second.additionalProperties;

    const title = first.title || second.title;
    const result: Tsoa.RefObjectType = {
      dataType: 'refObject',
      description,
      properties,
      additionalProperties,
      refName: first.refName,
      deprecated,
      example,
      ...(title && { title }),
    };

    return result;
  }

  public transform(declaration: TypeAliasDeclaration, refTypeName: string, resolver: TypeResolver, referencer?: Type): Tsoa.ReferenceType {
    const example = resolver.getNodeExample(declaration);

    const title = resolver.getNodeTitle(declaration);
    const referenceType: Tsoa.ReferenceType = {
      dataType: 'refAlias',
      default: TypeResolver.getDefault(declaration),
      description: resolver.getNodeDescription(declaration),
      refName: refTypeName,
      format: resolver.getNodeFormat(declaration),
      type: new TypeResolver(declaration.type, resolver.current, declaration, resolver.context, resolver.referencer || referencer).resolve(),
      validators: getPropertyValidators(declaration) || {},
      ...(example && { example }),
      ...(title && { title }),
    };
    return referenceType;
  }
}
