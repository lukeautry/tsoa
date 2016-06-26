import {Generator} from './generator';
import {GetSwaggerType, GetPathableSwaggerType} from './typeConversion';
import * as ts from 'typescript';

export class ApiMethodParameter {
    constructor(
        private parameter: ts.ParameterDeclaration,
        private path: string,
        private method: string,
        private hasBodyParameter: boolean
    ) { }

    public getParameter(): any {
        const parameterIdentifier = this.parameter.name as ts.Identifier;
        if (this.path.includes(`{${parameterIdentifier.text}}`)) {
            return this.getPathParameter(this.parameter);
        }

        if (this.supportsBodyParameters(this.method)) {
            try {
                return this.getQueryParameter(this.parameter);
            } catch (err) {
                return this.getBodyParameter(this.parameter);
            }
        }

        return this.getQueryParameter(this.parameter);
    }

    private getBodyParameter(parameter: ts.ParameterDeclaration) {
        const type = GetSwaggerType(parameter.type);
        const identifier = parameter.name as ts.Identifier;

        if (this.hasBodyParameter) {
            throw new Error(`Only one body parameter allowed per controller method. Attempted to parse ${identifier.text} as a body parameter.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'body',
            name: identifier.text,
            required: !parameter.questionToken,
            schema: type
        };
    }

    private getQueryParameter(parameter: ts.ParameterDeclaration) {
        const type = GetPathableSwaggerType(parameter.type);
        const identifier = parameter.name as ts.Identifier;

        return {
            description: this.getParameterDescription(parameter),
            in: 'query',
            name: identifier.text,
            required: !parameter.questionToken,
            type: type
        };
    }

    private getPathParameter(parameter: ts.ParameterDeclaration) {
        const type = GetPathableSwaggerType(parameter.type);
        const identifier = parameter.name as ts.Identifier;

        return {
            description: this.getParameterDescription(parameter),
            in: 'path',
            name: identifier.text,
            required: true, // Path parameters should always be required...right?
            type: type
        };
    }

    private getParameterDescription(node: ts.ParameterDeclaration) {
        const symbol = Generator.Current().TypeChecker().getSymbolAtLocation(node.name);

        const comments = symbol.getDocumentationComment();
        if (comments.length) { return ts.displayPartsToString(comments); }

        return undefined;
    }

    private supportsBodyParameters(method: string) {
        return ['post', 'put', 'patch'].some(m => m === method.toLowerCase());
    }
}
