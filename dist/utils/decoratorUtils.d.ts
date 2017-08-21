import * as ts from 'typescript';
export declare function getDecorators(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean): ts.Identifier[];
export declare function getDecoratorName(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean): string | undefined;
export declare function getDecoratorTextValue(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean): string | undefined;
export declare function getDecoratorOptionValue(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean): any;
export declare function isDecorator(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean): boolean;
