import { Tsoa } from '@tsoa/runtime';
import ts = require('typescript');
import { GenerateMetadataError } from '../metadataGeneration/exceptions';
import { MetadataGenerator } from '../metadataGeneration/metadataGenerator';
import { TypeResolver } from '../metadataGeneration/typeResolver';

export function getHeaderType(typeArgumentNodes: ts.NodeArray<ts.TypeNode> | undefined, index: number, metadataGenerator: MetadataGenerator): Tsoa.HeaderType | undefined {
  if (!typeArgumentNodes || !typeArgumentNodes[index]) {
    return undefined;
  }

  const candidate = new TypeResolver(typeArgumentNodes[index], metadataGenerator).resolve();

  if (candidate && supportHeaderDataType(candidate)) {
    return candidate;
  } else if (candidate) {
    throw new GenerateMetadataError(`Unable to parse Header Type ${typeArgumentNodes[index].getText()}`, typeArgumentNodes[index]);
  }

  return undefined;
}

export function supportHeaderDataType(parameterType: Tsoa.Type): parameterType is Tsoa.HeaderType {
  const supportedPathDataTypes: Tsoa.TypeStringLiteral[] = ['nestedObjectLiteral', 'refObject'];
  if (supportedPathDataTypes.find(t => t === parameterType.dataType)) {
    return true;
  }

  return false;
}
