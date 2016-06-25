import * as ts from 'typescript';
import {getSwaggerType, getReferencedTypes} from './typeConversion';
import {SpecBuilder} from './specBuilder';
import {Swagger} from './swagger';

export class DefinitionsBuilder {
    private program: ts.Program;

    constructor(private specBuilder: SpecBuilder, entryFile: string) {
        this.program = ts.createProgram([entryFile], {});
    }

    public generate() {
        const nodes = new Array<ts.Node>();
        this.program.getSourceFiles().forEach(sf => {
            ts.forEachChild(sf, node => {
                nodes.push(node);
            });
        });

        const typeReferences = getReferencedTypes();

        nodes
            .filter(n => n.kind === ts.SyntaxKind.InterfaceDeclaration && this.isExportedNode(n))
            .forEach((interfaceDeclaration: ts.InterfaceDeclaration) => {
                if (!typeReferences.some(r => r === interfaceDeclaration.name.text)) { return; }

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

                this.specBuilder.addDefinition(interfaceDeclaration.name.text, {
                    properties: properties,
                    required: requiredProperties,
                    type: 'object',
                });
            });
    }

    private isExportedNode(node: ts.Node) {
        return (node.flags & ts.NodeFlags.Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
    }
}
