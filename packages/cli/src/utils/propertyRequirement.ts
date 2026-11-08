import { Tsoa } from '@tsoa/runtime';

export const hasUndefined = (property: Tsoa.Property): boolean =>
  property.type.dataType === 'undefined' || (property.type.dataType === 'union' && property.type.types.some(type => type.dataType === 'undefined'));
