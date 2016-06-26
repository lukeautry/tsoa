import {ApiController} from './apiController';
import {Swagger} from './swagger';
import * as fs from 'fs';
import * as ts from 'typescript';

export class Generator {
    private static current: Generator;
    private definitions: { [definitionsName: string]: Swagger.Schema } = {};
    private nodes = new Array<ts.Node>();
    private paths: { [pathName: string]: Swagger.Path } = {};
    private typeChecker: ts.TypeChecker;

    public static Current() {
        return Generator.current;
    }

    public static IsExportedNode(node: ts.Node) {
        return (node.flags & ts.NodeFlags.Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
    }

    constructor() {
        Generator.current = this;
    }

    public GenerateJson(outFile: string, mainFile: string) {
        fs.writeFile(outFile, JSON.stringify(this.GetSpec(mainFile), null, '\t'), err => {
            if (err) {
                throw new Error(err.toString());
            };
        });
    }

    public GetSpec(mainFile: string): Swagger.Spec {
        this.Generate(mainFile);
        return {
            basePath: '/',
            consumes: ['application/json'],
            definitions: this.definitions,
            host: 'localhost:3000',
            info: {
                title: 'Lucid Web API',
                version: '0.0.1'
            },
            paths: this.paths,
            produces: ['application/json'],
            swagger: '2.0'
        };
    }

    public AddDefinition(name: string, schema: Swagger.Schema) {
        this.definitions[name] = schema;
    }

    public AddPath(name: string, path: Swagger.Path) {
        const existingPathObject = this.paths[name];
        if (existingPathObject) {
            path = Object.assign(path, existingPathObject);
        }

        this.paths[name] = path;
    }

    public Nodes() { return this.nodes; }
    public TypeChecker() { return this.typeChecker; }

    private Generate(mainFile: string) {
        const program = ts.createProgram([mainFile], {});
        this.typeChecker = program.getTypeChecker();

        program.getSourceFiles().forEach(sf => {
            ts.forEachChild(sf, node => {
                this.nodes.push(node);
            });
        });

        this.nodes
            .filter(n => n.kind === ts.SyntaxKind.ClassDeclaration && Generator.IsExportedNode(n))
            .map(c => new ApiController(c as ts.ClassDeclaration))
            .filter(c => c.isValid())
            .forEach(c => c.generatePaths());
    }
}
