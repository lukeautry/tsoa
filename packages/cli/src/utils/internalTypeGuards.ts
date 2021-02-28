// This file is designed to contain functions that narrow the input type to a type within src\metadataGeneration\tsoa.ts
import { Tsoa, assertNever } from '@tsoa/runtime';

/**
 * This will help us do exhaustive matching against only reference types. For example, once you have narrowed the input, you don't then have to check the case where it's a `integer` because it never will be.
 */
export function isRefType(metaType: Tsoa.Type): metaType is Tsoa.ReferenceType {
  switch (metaType.dataType) {
    case 'any':
      return false;
    case 'array':
      return false;
    case 'binary':
      return false;
    case 'boolean':
      return false;
    case 'buffer':
      return false;
    case 'byte':
      return false;
    case 'date':
      return false;
    case 'file':
      return false;
    case 'datetime':
      return false;
    case 'double':
      return false;
    case 'enum':
      return false;
    case 'float':
      return false;
    case 'integer':
      return false;
    case 'intersection':
      return false;
    case 'long':
      return false;
    case 'nestedObjectLiteral':
      return false;
    case 'object':
      return false;
    case 'refEnum':
      return true;
    case 'refObject':
      return true;
    case 'refAlias':
      return true;
    case 'string':
      return false;
    case 'union':
      return false;
    case 'void':
      return false;
    default: {
      return assertNever(metaType);
    }
  }
}
