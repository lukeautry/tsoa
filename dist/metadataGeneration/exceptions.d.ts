import * as ts from 'typescript';
export declare class GenerateMetadataError extends Error {
    constructor(message?: string, node?: ts.Node);
}
