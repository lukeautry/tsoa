import {ApiController} from './apiController';
import {Swagger} from './swagger';
import * as fs from 'fs';
import * as ts from 'typescript';

export namespace SwaggerGenerator {
    export const nodes = new Array<ts.Node>();
    export let typeChecker: ts.TypeChecker;
    const definitions: { [definitionsName: string]: Swagger.Schema } = {};
    const paths: { [pathName: string]: Swagger.Path } = {};
    let program: ts.Program;

    export function GenerateJson(outFile: string, mainFile: string) {
        fs.writeFile(outFile, JSON.stringify(GetSpec(mainFile), null, '\t'), err => {
            if (err) {
                throw new Error(err.toString());
            };
        });
    }

    export function GetSpec(mainFile: string): Swagger.Spec {
        generate(mainFile);

        return {
            basePath: '/',
            consumes: ['application/json'],
            definitions: definitions,
            host: 'localhost:3000',
            info: {
                title: 'Lucid Web API',
                version: '0.0.1'
            },
            paths: paths,
            produces: ['application/json'],
            swagger: '2.0'
        };
    }

    export function AddDefinition(name: string, schema: Swagger.Schema) {
        definitions[name] = schema;
    }

    export function AddPath(name: string, path: Swagger.Path) {
        const existingPathObject = paths[name];
        if (existingPathObject) {
            path = Object.assign(path, existingPathObject);
        }

        paths[name] = path;
    }

    export function IsExportedNode(node: ts.Node) {
        return (node.flags & ts.NodeFlags.Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
    }

    function generate(mainFile: string) {
        program = ts.createProgram([mainFile], {});
        typeChecker = program.getTypeChecker();

        program.getSourceFiles().forEach(sf => {
            ts.forEachChild(sf, node => {
                nodes.push(node);
            });
        });

        nodes
            .filter(n => n.kind === ts.SyntaxKind.ClassDeclaration && IsExportedNode(n))
            .map(c => new ApiController(c as ts.ClassDeclaration, typeChecker))
            .filter(c => c.isValid())
            .forEach(c => c.generatePaths());
    }
}
