export type MethodDecoratorReturn = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export type ClassDecoratorReturn = (constructor: any) => void;
export type ParameterDecoratorReturn = (target: object, propertyKey: string | symbol, parameterIndex: number) => void;
