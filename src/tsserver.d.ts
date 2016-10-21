import * as ts from 'typescript';

declare namespace tsserver {
    interface Node extends ts.Node {
        jsDocComments?: ts.JSDoc[];
    }
}

export = tsserver;
