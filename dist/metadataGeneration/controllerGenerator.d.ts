import * as ts from 'typescript';
import { Tsoa } from './tsoa';
export declare class ControllerGenerator {
    private readonly node;
    private readonly path?;
    private readonly tags?;
    private readonly security?;
    constructor(node: ts.ClassDeclaration);
    IsValid(): boolean;
    Generate(): Tsoa.Controller;
    private buildMethods();
    private getPath();
    private getTags();
    private getSecurity();
}
