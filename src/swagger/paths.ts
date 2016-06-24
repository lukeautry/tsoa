/// <reference path="../../typings/index.d.ts" />
/// <reference path="./swagger.d.ts" />

import * as ts from 'typescript';
import * as glob from 'glob';
import * as fs from 'fs';
import {Method} from '../routing/method';
import {getSwaggerType, getPathableSwaggerType} from './typeConversion';
import {SpecBuilder} from './specBuilder';

let builder: SpecBuilder = null;

export async function getPaths(specBuilder: SpecBuilder) {
    builder = specBuilder;
    return new Promise<{ [pathName: string]: Swagger.Path }>((resolve, reject) => {
        glob('./src/controllers/**/*Controller.ts', (err, files) => {
            files.forEach(f => {
                const sourceFile: ts.Node = ts.createSourceFile(f, fs.readFileSync(f).toString(), ts.ScriptTarget.ES6, true);
                ts.forEachChild(sourceFile, node => {
                    if (node.kind !== ts.SyntaxKind.ClassDeclaration) { return; }
                    getControllerActions(node as ts.ClassDeclaration);
                });
            });

            resolve();
        });
    });
}

function getControllerActions(node: ts.ClassDeclaration) {
    const baseRoute = getControllerRouteValue(node);
    node.members
        .filter(m => m.kind === ts.SyntaxKind.MethodDeclaration)
        .map(m => m as ts.MethodDeclaration)
        .forEach(m => {
            const metadata = getControllerActionMetadata(m);
            if (!metadata) { return; }

            const swaggerType = getSwaggerType(m.type);
            const pathObject: any = {};
            pathObject[metadata.method] = swaggerType ? get200Operation(swaggerType) : get204Operation();
            pathObject[metadata.method].parameters = getMethodParameters(m, metadata);
            builder.addPath(`/${baseRoute}${metadata.path}`, pathObject);
        });
}

function getMethodParameters(method: ts.MethodDeclaration, controllerActionMetadata: ControllerActionMetadata) {
    return method.parameters.map(p => {
        const parameterIdentifier = p.name as ts.Identifier;
        if (controllerActionMetadata.path.includes(`:${parameterIdentifier.text}`)) {
            return getPathParameter(p);
        }

        if (!supportsBodyParameters(controllerActionMetadata.method)) {
            return getQueryParameter(p);
        }

        return getBodyParameter(p);
    });
}

function getBodyParameter(parameter: ts.ParameterDeclaration) {
    const type = getSwaggerType(parameter.type);
    const identifier = parameter.name as ts.Identifier;

    return {
        description: 'placeholder',
        in: 'body',
        name: identifier.text,
        required: true,
        schema: type
    };
}

function getQueryParameter(parameter: ts.ParameterDeclaration) {
    const type = getPathableSwaggerType(parameter.type);
    if (!type) {
        throw new Error('Invalid path parameter type: only string, number, and bool values can be passed in the path.');
    }

    const identifier = parameter.name as ts.Identifier;
    return {
        description: 'Placeholder',
        in: 'query',
        name: identifier.text,
        required: true,
        type: type
    };
}

function getPathParameter(parameter: ts.ParameterDeclaration) {
    const type = getPathableSwaggerType(parameter.type);
    if (!type) {
        throw new Error('Invalid path parameter type: only string, number, and bool values can be passed in the path.');
    }

    const identifier = parameter.name as ts.Identifier;
    return {
        description: 'Placeholder',
        in: 'path',
        name: identifier.text,
        required: true, // TODO: For now, everything is required
        type: type
    };
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

function getControllerActionMetadata(node: ts.MethodDeclaration): ControllerActionMetadata {
    const decorators = node.decorators;
    if (!decorators || !decorators.length) { return null; }

    const pathDecorators = decorators
        .map(d => d.expression as ts.CallExpression)
        .map(e => e.expression as ts.Identifier)
        .filter(identifier => getValidMethods().some(m => m.toLowerCase() === identifier.text.toLowerCase()));

    if (!pathDecorators.length) { return null; }
    if (pathDecorators.length > 1) {
        throw new Error(`Only one path decorator allowed per method. Found: ${pathDecorators.map(d => d.text).join(', ')}`);
    }

    const decorator = pathDecorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const decoratorArgument = expression.arguments[0] as ts.StringLiteral;

    return {
        method: decorator.text.toLowerCase(),
        // if you don't pass in a path to the method decorator, we'll just use the base route
        // todo: what if someone has multiple no argument methods of the same type in a single controller?
        // we need to throw an error there
        path: decoratorArgument ? `/${decoratorArgument.text}` : ''
    };
}

function getValidMethods() {
    const validMethods = new Array<string>();

    for (let member in Method) {
        const isValueProperty = parseInt(member, 10) >= 0;
        if (isValueProperty) {
            validMethods.push(Method[member]);
        }
    }

    return validMethods;
}

function get200Operation(swaggerType: Swagger.Schema) {
    return {
        produces: ['application/json'],
        responses: {
            '200': {
                description: '',
                schema: swaggerType
            }
        }
    };
}

function get204Operation() {
    return {
        responses: {
            '204': { description: 'No content' }
        }
    };
}

function supportsBodyParameters(method: string) {
    return ['post', 'put', 'patch'].some(m => m === method.toLowerCase());
}

interface ControllerActionMetadata {
    method: string;
    path: string;
}
