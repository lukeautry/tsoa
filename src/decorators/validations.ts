export interface DateOption {
  minDate?: Date;
  maxDate?: Date;
}

export interface NumberOption {
  min?: number;
  max?: number;
}

export interface StringOption {
  minLength?: number;
  maxLength?: number;
  pattern?: number;
}

export interface ArrayOption {
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
}

export function IsInt(options?: NumberOption): any {
  return () => { return; };
}

export function IsLong(options?: NumberOption): any {
  return () => { return; };
}

export function IsFloat(options?: NumberOption): any {
  return () => { return; };
}

export function IsDouble(options?: NumberOption): any {
  return () => { return; };
}

export function IsDate(options?: DateOption): any {
  return () => { return; };
}

export function IsDateTime(options?: DateOption): any {
  return () => { return; };
}

export function IsString(options?: StringOption): any {
  return () => { return; };
}

export function IsArray(options?: ArrayOption): any {
  return () => { return; };
}

