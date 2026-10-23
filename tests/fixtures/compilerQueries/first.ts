export function localValue() {
  type Local = { value: string };
  const value: Local = { value: 'local' };
  return value;
}

export interface Later {
  field: string;
}
