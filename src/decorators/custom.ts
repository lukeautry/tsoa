const METADATA_KEY = `tsoa_custom_parameter`;

export function CustomParameter(getParam: (req: any) => any) {
  return (target: object, key: string | symbol, index: number) =>  {
    if (!target[METADATA_KEY]) {
      target[METADATA_KEY] = {};
    }

    const details = {
      getParam,
      index,
    };
    if (target[METADATA_KEY][key]) {
      target[METADATA_KEY][key].push(details);
    } else {
      target[METADATA_KEY][key] = [details];
    }
  };
}

export function CustomParameters() {
  return (target: object, key: string | symbol, descriptor: any) =>  {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
      const customParams = target[METADATA_KEY][key];
      for (const {getParam, index} of customParams) {
        args[index] = await getParam(args[index]);
      }
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}
