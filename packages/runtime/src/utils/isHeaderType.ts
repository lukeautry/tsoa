/**
 * Checks for a supported header type
 * key types can be `never` to support `{}` or `number` to support
 */
export type IsValidHeader<Header> = keyof Header extends string
  ? Header[keyof Header] extends string | string[] | undefined
    ? {}
    : 'Header values must be string or string[]'
  : 'Header names must be of type string';
