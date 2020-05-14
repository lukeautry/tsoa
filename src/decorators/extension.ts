// tslint:disable-next-line:variable-name
export function Extension(_name: string, _value: ExtensionType | ExtensionType[]): Function {
  return () => {
    return;
  };
}

export type ExtensionType = string | { [name: string]: ExtensionType };
