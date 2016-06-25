/// <reference path="./swagger.d.ts" />

import * as ts from 'typescript';
import {SpecBuilder} from './specBuilder';
import {ApiController} from './apiController';
import {DefinitionsBuilder} from './definitionsBuilder';

export class PathsBuilder {
    private program: ts.Program;
    private typeChecker: ts.TypeChecker;

    constructor(private specBuilder: SpecBuilder, private entryFile: string) {
        this.program = ts.createProgram([entryFile], {});
        this.typeChecker = this.program.getTypeChecker();
    }

    public generate() {
        const nodes = new Array<ts.Node>();
        this.program.getSourceFiles().forEach(sf => {
            ts.forEachChild(sf, node => {
                nodes.push(node);
            });
        });

        nodes
            .filter(n => n.kind === ts.SyntaxKind.ClassDeclaration && this.isExportedNode(n))
            .map(c => new ApiController(c as ts.ClassDeclaration, this.specBuilder))
            .filter(c => c.isValid())
            .forEach(c => c.generatePaths());

        new DefinitionsBuilder(this.specBuilder, this.entryFile).generate();
    }

    private isExportedNode(node: ts.Node) {
        return (node.flags & ts.NodeFlags.Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
    }
}
