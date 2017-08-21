import * as ts from 'typescript';
import { Tsoa } from './tsoa';
export declare class MethodGenerator {
    private readonly node;
    private readonly parentTags;
    private readonly parentSecurity;
    private method;
    private path;
    constructor(node: ts.MethodDeclaration, parentTags?: string[] | undefined, parentSecurity?: Tsoa.Security[] | undefined);
    IsValid(): boolean;
    Generate(): Tsoa.Method;
    private buildParameters();
    private getCurrentLocation();
    private processMethodDecorators();
    private getMethodResponses();
    private getMethodSuccessResponse(type);
    private getMethodSuccessExamples();
    private supportsPathMethod(method);
    private getExamplesValue(argument);
    private getTags();
    private getIsHidden();
    private getSecurity();
}
