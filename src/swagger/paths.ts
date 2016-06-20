/// <reference path="../../typings/index.d.ts" />
/// <reference path="./swagger.d.ts" />

import * as ts from 'typescript';
import * as glob from 'glob';
import * as fs from 'fs';
// import {typeMap} from './typeMap';

export async function getPaths() {
    return new Promise<{ [pathName: string]: Swagger.Path }>((resolve, reject) => {
        glob('./src/controllers/**/*Controller.ts', (err, files) => {
            const paths: { [pathName: string]: Swagger.Path } = {};

            files.forEach(f => {
                const sourceFile: ts.Node = ts.createSourceFile(f, fs.readFileSync(f).toString(), ts.ScriptTarget.ES6, true);
                ts.forEachChild(sourceFile, node => {
                    if (node.kind !== ts.SyntaxKind.ClassDeclaration) { return; }
                    getControllerActions(paths, node as ts.ClassDeclaration);
                });
            });

            resolve(paths);
        });
    });
}

function getControllerActions(paths: { [pathName: string]: Swagger.Path }, node: ts.ClassDeclaration) {
    /* tslint:disable */
    const baseRoute = getControllerRouteValue(node);
    node.members
        .filter(m => m.kind === ts.SyntaxKind.MethodDeclaration)
        .map(m => m as ts.MethodDeclaration)
        .forEach(m => {
            console.log(m);
        });
}

function getControllerRouteValue(node: ts.ClassDeclaration) {
    const matchedAttribute = node.decorators
        .map(d => d.expression as ts.CallExpression)
        .find(expression => {
            const subExpression = expression.expression as ts.Identifier;
            return subExpression.text === 'Route';
        });

    if (!matchedAttribute) { return ''; }

    const value = matchedAttribute.arguments[0] as ts.StringLiteral;
    return value.text;
}
