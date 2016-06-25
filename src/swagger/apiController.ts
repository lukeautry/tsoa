import {ApiMethod} from './apiMethod';
import {SpecBuilder} from './specBuilder';
import * as ts from 'typescript';

export class ApiController {
    private pathValue: string;

    constructor(
        private node: ts.ClassDeclaration,
        private specBuilder: SpecBuilder
    ) {
        this.pathValue = this.getControllerRouteValue(node);
    }

    public isValid() {
        return !!this.pathValue;
    }

    public generatePaths() {
        this.node.members
            .filter(m => m.kind === ts.SyntaxKind.MethodDeclaration)
            .map(m => m as ts.MethodDeclaration)
            .map(m => new ApiMethod(m, this.pathValue, this.specBuilder))
            .filter(apiMethod => apiMethod.isValid())
            .forEach(apiMethod => apiMethod.generate());
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
        return value.text;
    }
}
