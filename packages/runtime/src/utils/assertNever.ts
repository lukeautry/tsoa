/**
 * This function does exhaustiveness checking to ensure that you have discriminated a union so that no type remains. Use this to get the typescript compiler to help discover cases that were not considered.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`);
}
