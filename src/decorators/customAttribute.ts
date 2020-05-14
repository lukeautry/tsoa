// tslint:disable-next-line:variable-name
export function CustomAttribute(_name: string, _value: CustomAttributeType | CustomAttributeType[]): Function {
  return () => {
    return;
  };
}

export type CustomAttributeType = string | { [name: string]: CustomAttributeType };
