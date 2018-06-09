export const keys = {
  baseRoute: '__base_route',
  controllerClass: '__controller_class',
  pathExpression: '__pathExpression',
};

export function routeTo(handler, args?: object) {
  const baseRoute = handler[keys.controllerClass][keys.baseRoute];
  let pathValue: string = handler[keys.pathExpression] || '';
  if (args && pathValue) {
    const argProps = Object.getOwnPropertyNames(args);
    for (const argProp of argProps) {
      pathValue = pathValue.replace('{' + argProp + '}', args[argProp]);
    }
  }
  return (
    '/' + baseRoute + '/' + encodeURI(pathValue)
  );
}

// const saveRoute =

export function Get(value?: string): any {
  return (target: any, propertyKey: string) => {
    target[propertyKey][keys.controllerClass] = target.constructor;
    target[propertyKey][keys.pathExpression] = value;
  };
}

export function Post(value?: string): any {
  return (target: any, propertyKey: string) => {
    target[propertyKey][keys.controllerClass] = target.constructor;
    target[propertyKey][keys.pathExpression] = value;
  };
}

export function Put(value?: string): any {
  return (target: any, propertyKey: string) => {
    target[propertyKey][keys.controllerClass] = target.constructor;
    target[propertyKey][keys.pathExpression] = value;
  };
}

export function Patch(value?: string): any {
  return (target: any, propertyKey: string) => {
    target[propertyKey][keys.controllerClass] = target.constructor;
    target[propertyKey][keys.pathExpression] = value;
  };
}

export function Delete(value?: string): any {
  return (target: any, propertyKey: string) => {
    target[propertyKey][keys.controllerClass] = target.constructor;
    target[propertyKey][keys.pathExpression] = value;
  };
}
