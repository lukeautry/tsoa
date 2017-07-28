import * as ts from 'typescript';
import { Tsoa } from './tsoa';
export declare class ControllerGenerator {
    private readonly node;
    private readonly pathValue;
    constructor(node: ts.ClassDeclaration);
    IsValid(): boolean;
    Generate(): Tsoa.Controller;
    private buildMethods();
    private getControllerRouteValue(node);
    private getControllerDecoratorValue(node, decoratorName, defaultValue);
}
