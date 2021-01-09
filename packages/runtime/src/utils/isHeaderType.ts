/**
 * Checks for a supported header type
 * key types can be `number` to support string indexed access types
 */
export type IsValidHeader<Header> = keyof Header extends string | number
  ? Header[keyof Header] extends string | string[] | undefined
    ? {}
    : 'Header values must be string or string[]'
  : 'Header names must be of type string';
