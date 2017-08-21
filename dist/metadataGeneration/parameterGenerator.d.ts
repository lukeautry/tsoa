import * as ts from 'typescript';
import { Tsoa } from './tsoa';
export declare class ParameterGenerator {
    private readonly parameter;
    private readonly method;
    private readonly path;
    constructor(parameter: ts.ParameterDeclaration, method: string, path: string);
    Generate(): Tsoa.Parameter;
    private getRequestParameter(parameter);
    private getBodyPropParameter(parameter);
    private getBodyParameter(parameter);
    private getHeaderParameter(parameter);
    private getQueryParameter(parameter);
    private getPathParameter(parameter);
    private getParameterDescription(node);
    private supportBodyMethod(method);
    private supportParameterDecorator(decoratorName);
    private supportPathDataType(parameterType);
    private getValidatedType(parameter, extractEnum?);
}
