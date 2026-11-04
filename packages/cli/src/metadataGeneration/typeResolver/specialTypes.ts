import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { dateFormat } from './annotations';
import type { Site } from './site';

/**
 * Types tsoa maps specially. They are recognized by name: the written reference when there is
 * one (so an alias of Date is first resolved as an alias), else the type's symbol. `site` must
 * already be followed.
 */
export function resolveSpecialType(type: ts.Type, site: Site): Tsoa.Type | undefined {
  switch (specialName(type, site)) {
    case 'Date':
      return dateFormat(site.declaration);
    case 'Buffer':
    case 'Readable':
      return { dataType: 'buffer' };
    case 'String':
      return { dataType: 'string' };
    default:
      return undefined;
  }
}

/** A `Promise<T>`, whose value `T` is what an API returns. `site` must already be followed. */
export function isPromise(type: ts.Type, site: Site): boolean {
  return specialName(type, site) === 'Promise' && promiseArity(type, site) === 1;
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
