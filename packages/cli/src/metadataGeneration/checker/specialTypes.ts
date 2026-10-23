import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import type { MetadataGenerator } from '../metadataGenerator';
import { DateTransformer } from '../transformer/dateTransformer';
import { followSite, type Site } from './site';

/**
 * Types tsoa maps specially. Like legacy, they are recognized by name: the written reference when
 * there is one (so an alias of Date is first resolved as an alias), else the type's symbol.
 * Returns 'promise' when the caller should unwrap the single type argument.
 */
export function resolveSpecialType(type: ts.Type, site: Site, _generator: MetadataGenerator): Tsoa.Type | 'promise' | undefined {
  const followed = followSite(site);
  const name = specialName(type, followed);
  switch (name) {
    case 'Date':
      return new DateTransformer().transform(site.declaration);
    case 'Buffer':
    case 'Readable':
      return { dataType: 'buffer' };
    case 'String':
      return { dataType: 'string' };
    case 'Promise':
      return promiseArity(type, followed) === 1 ? 'promise' : undefined;
    default:
      return undefined;
  }
}

function specialName(type: ts.Type, site: Site): string | undefined {
  if (site.node) {
    return ts.isTypeReferenceNode(site.node) && ts.isIdentifier(site.node.typeName) ? site.node.typeName.text : undefined;
  }
  return type.aliasSymbol ? undefined : type.getSymbol()?.getName();
}

function promiseArity(type: ts.Type, site: Site): number {
  if (site.node && ts.isTypeReferenceNode(site.node)) {
    return site.node.typeArguments?.length ?? 0;
  }
  return (type as ts.TypeReference).typeArguments?.length ?? 0;
}
