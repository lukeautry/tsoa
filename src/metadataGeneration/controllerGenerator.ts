import * as ts from 'typescript';
import {Controller} from './metadataGenerator';
import {MethodGenerator} from './methodGenerator';

export class ControllerGenerator {
    private readonly pathValue: string;

    constructor(private readonly node: ts.ClassDeclaration) {
        this.pathValue = this.getControllerRouteValue(node);
    }

    public IsValid() {
        return !!this.pathValue || this.pathValue === '';
    }

    public Generate(): Controller {
        const sourceFile = this.node.parent.getSourceFile();

        return {
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.node.name.text,
            path: this.pathValue
        };
    }

    private buildMethods() {
        return this.node.members
            .filter(m => m.kind === ts.SyntaxKind.MethodDeclaration)
            .map((m: ts.MethodDeclaration) => new MethodGenerator(m))
            .filter(generator => generator.IsValid())
            .map(generator => generator.Generate());
    }

    private getControllerRouteValue(node: ts.ClassDeclaration) {
        if (!node.decorators) { return null; }

        const matchedAttributes = node.decorators
            .map(d => d.expression as ts.CallExpression)
            .filter(expression => {
                const subExpression = expression.expression as ts.Identifier;
                return subExpression.text === 'Route';
            });

        if (!matchedAttributes.length) { return null; }
        if (matchedAttributes.length > 1) {
            throw new Error('A controller can only have a single "Route" decorator.');
        }

        const value = matchedAttributes[0].arguments[0] as ts.StringLiteral;
        return value ? value.text : '';
    }
}
