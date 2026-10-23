import { Tsoa } from '@tsoa/runtime';
import { NodeArray, TypeNode } from 'typescript';
import { GenerateMetadataError } from '../metadataGeneration/exceptions';
import { MetadataGenerator } from '../metadataGeneration/metadataGenerator';

export function getHeaderType(typeArgumentNodes: NodeArray<TypeNode> | undefined, index: number, metadataGenerator: MetadataGenerator): Tsoa.HeaderType | undefined {
  if (!typeArgumentNodes || !typeArgumentNodes[index]) {
    return undefined;
  }

  const candidate = metadataGenerator.resolveType(typeArgumentNodes[index]);

  if (candidate && isSupportedHeaderDataType(candidate)) {
    return candidate;
  } else if (candidate) {
    throw new GenerateMetadataError(`Unable to parse Header Type ${typeArgumentNodes[index].getText()}`, typeArgumentNodes[index]);
  }

  return undefined;
}

export function isSupportedHeaderDataType(parameterType: Tsoa.Type): parameterType is Tsoa.HeaderType {
  const supportedPathDataTypes: Tsoa.TypeStringLiteral[] = ['nestedObjectLiteral', 'refObject'];
  if (supportedPathDataTypes.find(t => t === parameterType.dataType)) {
    return true;
  }

  return false;
}
