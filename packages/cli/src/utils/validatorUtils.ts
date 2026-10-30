import { Tsoa } from '@tsoa/runtime';

export function shouldIncludeValidatorInSchema(key: string): key is Tsoa.SchemaValidatorKey {
  return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
}
