import { Tsoa } from '@tsoa/runtime';
import { hasUndefined, isRequiredWithoutDefault } from './propertyRequirement';

export interface UnionDiscriminator {
  propertyName: string;
  /** One entry per union member, in order, with the tag values that select it. */
  members: Array<{ type: Tsoa.RefObjectType | Tsoa.RefAliasType; values: string[] }>;
}

const isRefObject = (t: Tsoa.Type): t is Tsoa.RefObjectType => t.dataType === 'refObject';
const isRefAlias = (t: Tsoa.Type): t is Tsoa.RefAliasType => t.dataType === 'refAlias';
const isNestedObjectLiteral = (t: Tsoa.Type): t is Tsoa.NestedObjectLiteralType => t.dataType === 'nestedObjectLiteral';
const isStringEnum = (t: Tsoa.Type): t is Tsoa.EnumType => t.dataType === 'enum' && t.enums.length > 0 && t.enums.every(value => typeof value === 'string');

/**
 * Detects a discriminated union of ref types: every member is a refObject or a refAlias of
 * an inline object literal, and exactly one property is required on every member with a non-empty,
 * string-only enum type (a string literal, or `keyof` an object type) whose values don't repeat in
 * another member. Members that aren't ref types can't be targeted by a discriminator mapping, so
 * those unions have no discriminator.
 *
 * Callers pass the union members without null/undefined. `isTagRequired` decides whether a property is required on every
 * object of its member, which a tag must be.
 */
export function getUnionDiscriminator(
  types: Tsoa.Type[],
  isTagRequired: (property: Tsoa.Property) => boolean = property => !!isRequiredWithoutDefault(property) && !hasUndefined(property),
): UnionDiscriminator | null {
  if (types.length < 2 || !types.every(t => isRefObject(t) || isRefAlias(t))) {
    return null;
  }
  const refTypes = types;

  // Collect every required, string-literal-enum property found on each member, keyed by property name.
  const enumsByPropertyName = new Map<string, string[][]>();
  for (const refType of refTypes) {
    // A refAlias pointing at another ref type (rather than an inline object) is not unwrapped further.
    const properties = isRefObject(refType) ? refType.properties : isNestedObjectLiteral(refType.type) ? refType.type.properties : undefined;
    if (!properties) {
      return null;
    }
    // The emitted schema keeps the last property of each name and drops one named `__proto__`.
    for (const property of new Map(properties.map(p => [p.name, p])).values()) {
      if (property.name !== '__proto__' && isTagRequired(property) && isStringEnum(property.type)) {
        const enums = enumsByPropertyName.get(property.name) ?? [];
        enums.push(property.type.enums as string[]);
        enumsByPropertyName.set(property.name, enums);
      }
    }
  }

  // A usable discriminator property must appear on every member, with values that don't overlap.
  const candidates = Array.from(enumsByPropertyName.entries()).filter(([, enumsPerMember]) => {
    if (enumsPerMember.length !== refTypes.length) {
      return false;
    }
    const allValues = enumsPerMember.flat();
    const uniqueValues = new Set(allValues);
    return uniqueValues.size === allValues.length;
  });

  // If more than one property qualifies, the discriminator would be ambiguous - bail out.
  if (candidates.length !== 1) {
    return null;
  }

  const [propertyName, enumsPerMember] = candidates[0];
  return { propertyName, members: refTypes.map((type, index) => ({ type, values: enumsPerMember[index] })) };
}
