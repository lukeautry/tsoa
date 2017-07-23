import * as ts from 'typescript';
export declare class GenerateMetadataError extends Error {
    constructor(node: ts.Node, message: string);
}
