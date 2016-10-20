import * as ts from 'typescript';

declare namespace tsserver {
    interface Node extends ts.Node {
        jsDocComments: ts.JSDocComment[];
    }
    interface JSDocTag extends ts.JSDocTag {
        comment: string;
    }
}

export = tsserver;
