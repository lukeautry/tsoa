export type ReturnType<T> = { shadowReturn: T };
export type InstanceType<T> = { shadowInstance: T };
export type Parameters<T> = [{ shadowParameter: T }];
export type NonNullable<T> = { shadowNonNullable: T };

export function factory() {
  return { returned: 'ok' };
}

export class Owner {
  public method(argument: { value: string }) {
    return argument;
  }
}

export function accept(argument: { value: string }) {
  return argument;
}

export let maybe: { value: string } | null;
