import * as ts from 'typescript';
import { Tsoa } from './tsoa';
export declare function resolveType(typeNode: ts.TypeNode, parentNode?: ts.Node, extractEnum?: boolean): Tsoa.Type;
export declare function getInitializerValue(initializer?: ts.Expression, type?: Tsoa.Type): any;
