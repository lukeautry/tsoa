import { Tsoa } from '@tsoa/runtime';

export const isRequiredWithoutDefault = (prop: Tsoa.Property | Tsoa.Parameter): boolean | undefined => prop.required && prop.default == null;

export const hasUndefined = (property: Tsoa.Property): boolean =>
  property.type.dataType === 'undefined' || (property.type.dataType === 'union' && property.type.types.some(type => type.dataType === 'undefined'));
