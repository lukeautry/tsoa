import * as ts from 'typescript';

export class GenerateMetadataError extends Error {
    constructor(message?: string, node?: ts.Node) {
        super(message);
        if (node) {
            this.message = `${message}\n in: ${getSourceFile(node)}`;
        }
    }
}

function getSourceFile(node: ts.Node): string {
    if (node.kind === ts.SyntaxKind.SourceFile) {
        return (node as ts.SourceFile).fileName;
    } else {
        if (node.parent) {
            return getSourceFile(node.parent);
        } else {
            return '';
        }
    }
}
