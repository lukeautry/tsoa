/// <reference path="./swagger.d.ts" />
import * as ts from 'typescript';

export const typeMap: { [kind: number]: Swagger.Schema } = {};
typeMap[ts.SyntaxKind.NumberKeyword] = { format: 'int64', type: 'integer' };
typeMap[ts.SyntaxKind.StringKeyword] = { type: 'string' };
typeMap[ts.SyntaxKind.BooleanKeyword] = { type: 'boolean' };
