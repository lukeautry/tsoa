/// <reference path="../../typings/index.d.ts" />
/// <reference path="./swagger.d.ts" />

import * as ts from 'typescript';
import * as glob from 'glob';
import * as fs from 'fs';
import {getSwaggerType} from './typeConversion';
import {SpecBuilder} from './specBuilder';

let builder: SpecBuilder = null;

export async function getDefinitions(specBuilder: SpecBuilder) {
    builder = specBuilder;
    return new Promise<{ [definitionsName: string]: Swagger.Schema }>((resolve, reject) => {
        glob('./src/models/**/*.ts', (err, files) => {
            files.forEach(f => getModelsFromFile(f));

            resolve();
        });
    });
}

function getModelsFromFile(path: string) {
    const sourceFile: ts.Node = ts.createSourceFile(path, fs.readFileSync(path).toString(), ts.ScriptTarget.ES6, true);

    ts.forEachChild(sourceFile, node => {
        if (node.kind !== ts.SyntaxKind.InterfaceDeclaration) { return; }

        const interfaceDeclaration = node as ts.InterfaceDeclaration;
        const requiredProperties = new Array<string>();
        const properties: { [propertyName: string]: Swagger.Schema } = {};

        interfaceDeclaration.members
            .filter(m => m.kind === ts.SyntaxKind.PropertySignature)
            .forEach((m: any) => {
                const propertyDeclaration = m as ts.PropertyDeclaration;
                const propertyName = (propertyDeclaration.name as ts.Identifier).text;

                const isRequired = !m.questionToken;
                if (isRequired) {
                    requiredProperties.push(propertyName);
                }

                properties[propertyName] = getSwaggerType(propertyDeclaration.type);
            });

        builder.addDefinition(interfaceDeclaration.name.text, {
            properties: properties,
            required: requiredProperties,
            type: 'object',
        });
    });
}
