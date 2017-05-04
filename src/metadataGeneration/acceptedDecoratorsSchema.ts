
/**
 * Function that generate new controller instance from typescript declaration
 */
// export interface DecoratorDescriptorFunction<ParameterType, ResultType> {
//     ( source:ParameterType ): ResultType
// }

export interface DecoratorDefinition {
    name: string;
    tsoaDecorator: string;
}
export interface DecoratorsSchema {
    controllersDecorators: Array<CustomControllerDecorator>,
    methodDecorators: Array<CustomMethodDecorator>,
    parameterDecorators: Array<CustomParameterDecorator>
}

export interface CustomControllerDecorator extends DecoratorDefinition {
}

export interface CustomMethodDecorator extends DecoratorDefinition {
}

export interface CustomParameterDecorator extends DecoratorDefinition {
}