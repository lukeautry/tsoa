import {MetadataGenerator, Parameter, Type} from './metadataGenerator';
import {ResolveType} from './resolveType';
import * as ts from 'typescript';

export class ParameterGenerator {
    constructor(
        private readonly parameter: ts.ParameterDeclaration,
        private readonly method: string,
        private readonly path: string
    ) { }

    public Generate(): Parameter {
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
        const type = ResolveType(parameter.type);
        const identifier = parameter.name as ts.Identifier;

        return {
            description: this.getParameterDescription(parameter),
            in: 'body',
            name: identifier.text,
            required: !parameter.questionToken,
            type: type
        };
    }

    private getQueryParameter(parameter: ts.ParameterDeclaration) {
        const type = ResolveType(parameter.type);
        const identifier = parameter.name as ts.Identifier;

        if (!this.isPathableType(type)) {
            throw new Error(`Parameter '${identifier.text}' can't be passed as a query parameter.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'query',
            name: identifier.text,
            required: !parameter.questionToken,
            type: type
        };
    }

    private getPathParameter(parameter: ts.ParameterDeclaration) {
        const type = ResolveType(parameter.type);
        const identifier = parameter.name as ts.Identifier;

        if (!this.isPathableType(type)) {
            throw new Error(`Parameter '${identifier.text}' can't be passed as a path parameter.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'path',
            name: identifier.text,
            // TODISCUSS: Path parameters should always be required...right?
            // Apparently express doesn't think so, but I think being able to
            // have combinations of required and optional path params makes behavior
            // pretty confusing to clients
            required: true,
            type: type
        };
    }

    private getParameterDescription(node: ts.ParameterDeclaration) {
        const symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);

        const comments = symbol.getDocumentationComment();
        if (comments.length) { return ts.displayPartsToString(comments); }

        return undefined;
    }

    private supportsBodyParameters(method: string) {
        return ['post', 'put', 'patch'].some(m => m === method.toLowerCase());
    }

    private isPathableType(parameterType: Type) {
        if (!(typeof parameterType === 'string' || parameterType instanceof String)) {
            return false;
        }

        const type = parameterType as string;
        return !!['string', 'boolean', 'number'].find(t => t === type);
    }
}
