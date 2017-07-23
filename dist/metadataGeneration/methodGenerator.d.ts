import * as ts from 'typescript';
import { Method } from './types';
export declare class MethodGenerator {
    private readonly node;
    private method;
    private path;
    constructor(node: ts.MethodDeclaration);
    IsValid(): boolean;
    Generate(): Method;
    private buildParameters();
    private getCurrentLocation();
    private processMethodDecorators();
    private getMethodResponses();
    private getMethodSuccessResponse(type);
    private getMethodSuccessExamples();
    private supportsPathMethod(method);
    private getExamplesValue(argument);
    private getMethodTags();
    private getMethodSecurity();
}
