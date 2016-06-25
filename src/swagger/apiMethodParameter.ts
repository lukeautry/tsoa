import {getSwaggerType, getPathableSwaggerType} from './typeConversion';
import * as ts from 'typescript';

export class ApiMethodParameter {
    constructor(
        private parameter: ts.ParameterDeclaration,
        private path: string,
        private method: string
    ) { }

    public getParameter(): any {
        const parameterIdentifier = this.parameter.name as ts.Identifier;
        if (this.path.indexOf(`{${parameterIdentifier.text}}`) !== -1) {
            return this.getPathParameter(this.parameter);
        }

        if (!this.supportsBodyParameters(this.method)) {
            return this.getQueryParameter(this.parameter);
        }

        return this.getBodyParameter(this.parameter);
    }

    private getBodyParameter(parameter: ts.ParameterDeclaration) {
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

    private getQueryParameter(parameter: ts.ParameterDeclaration) {
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

    private getPathParameter(parameter: ts.ParameterDeclaration) {
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

    private supportsBodyParameters(method: string) {
        return ['post', 'put', 'patch'].some(m => m === method.toLowerCase());
    }
}
