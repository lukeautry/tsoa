export const DEFAULT_REQUEST_MEDIA_TYPE = 'application/json';
export const DEFAULT_RESPONSE_MEDIA_TYPE = 'application/json';

export function getValue(type: 'string' | 'number' | 'integer' | 'boolean', member: any) {
  if (member === null) {
    return null;
  }

  switch (type) {
    case 'integer':
    case 'number':
      return Number(member);
    case 'boolean':
      return member;
    case 'string':
    default:
      return String(member);
  }
}
