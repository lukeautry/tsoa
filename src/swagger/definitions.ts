/// <reference path="../../typings/index.d.ts" />
/// <reference path="./swagger.d.ts" />

import * as ts from 'typescript';
import * as glob from 'glob';
import * as fs from 'fs';
import {typeMap} from './typeMap';

export async function getDefinitions() {
    return new Promise<{ [definitionsName: string]: Swagger.Schema }>((resolve, reject) => {
        glob('./src/models/**/*.ts', (err, files) => {
            const definitions: { [definitionsName: string]: Swagger.Schema } = {};

            files.forEach(f => {
                const sourceFile: ts.Node = ts.createSourceFile(f, fs.readFileSync(f).toString(), ts.ScriptTarget.ES6, true);

                ts.forEachChild(sourceFile, node => {
                    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                        const interfaceDeclaration = node as ts.InterfaceDeclaration;
                        const requiredProperties = new Array<string>();
                        const properties: { [propertyName: string]: Swagger.Schema } = {};

                        interfaceDeclaration.members
                            .filter(m => m.kind === ts.SyntaxKind.PropertySignature)
                            .forEach(m => {
                                const propertyDeclaration = m as any;
                                const propertyName = propertyDeclaration.name.text;

                                const isRequired = !m.questionToken;
                                if (isRequired) {
                                    requiredProperties.push(propertyName);
                                }

                                properties[propertyDeclaration.name.text] = getSwaggerType(propertyDeclaration.type);
                            });

                        definitions[interfaceDeclaration.name.text] = {
                            properties: properties,
                            required: requiredProperties,
                            type: 'object',
                        };
                    }
                });
            });

            resolve(definitions);
        });
    });
}

function getSwaggerType(propertyType: ts.Node): Swagger.Schema {
    const swaggerType = typeMap[propertyType.kind];
    if (swaggerType) { return swaggerType; }

    if (propertyType.kind !== ts.SyntaxKind.ArrayType) {
        throw new Error('Unable to convert TypeScript type to a Swagger type metadata.');
    }

    const arrayType = propertyType as ts.ArrayTypeNode;
    if (arrayType.elementType.kind === ts.SyntaxKind.TypeReference) {
        const typeReference = (arrayType.elementType as any).typeName.text;
        return {
            items: {
                $ref: `#/definitions/${typeReference}`
            },
            type: 'array'
        };
    }

    const primitiveArrayType = typeMap[arrayType.elementType.kind];
    if (!primitiveArrayType) { throw new Error('Property was an array type, but it wasn\'t a type reference or a primitive.'); }

    return {
        items: primitiveArrayType,
        type: 'array'
    };
}
