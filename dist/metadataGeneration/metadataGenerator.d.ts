import * as ts from 'typescript';
import { Tsoa } from './tsoa';
export declare class MetadataGenerator {
    static current: MetadataGenerator;
    readonly nodes: ts.Node[];
    readonly typeChecker: ts.TypeChecker;
    private readonly program;
    private referenceTypeMap;
    private circularDependencyResolvers;
    IsExportedNode(node: ts.Node): boolean;
    constructor(entryFile: string, compilerOptions?: ts.CompilerOptions);
    Generate(): Tsoa.Metadata;
    TypeChecker(): ts.TypeChecker;
    AddReferenceType(referenceType: Tsoa.ReferenceType): void;
    GetReferenceType(refName: string): Tsoa.ReferenceType;
    OnFinish(callback: (referenceTypes: Tsoa.ReferenceTypeMap) => void): void;
    private buildControllers();
}
