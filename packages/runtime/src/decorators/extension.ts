export function Extension(_name: string, _value: ExtensionType | ExtensionType[]): Function {
  return () => {
    return;
  };
}

export type ExtensionType = string | string[] | { [name: string]: ExtensionType | ExtensionType[] };
