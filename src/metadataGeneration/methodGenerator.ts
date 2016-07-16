import * as ts from 'typescript';
import {Method, MetadataGenerator} from './metadataGenerator';
import {ResolveType} from './resolveType';
import {ParameterGenerator} from './parameterGenerator';

export class MethodGenerator {
    private method: string;
    private path: string;

    constructor(private readonly node: ts.MethodDeclaration) {
        this.processMethodDecorators();
    }

    public IsValid() {
        return !!this.method;
    }

    public Generate(): Method {
        if (!this.IsValid()) { throw new Error('This isn\'t a valid a controller method.'); }
        if (!this.node.type) { throw new Error('Controller methods must have a return type.'); }

        const identifier = this.node.name as ts.Identifier;

        return {
            description: this.getMethodDescription(),
            example: this.getMethodExample(),
            method: this.method,
            name: identifier.text,
            parameters: this.getParameters(),
            path: this.path,
            type: ResolveType(this.node.type)
        };
    }

    private getParameters() {
        return this.node.parameters.map(p => {
            return new ParameterGenerator(p, this.method, this.path).Generate();
        });
    }

    private processMethodDecorators() {
        const pathDecorators = this.getDecorators(identifier => {
            return this.getValidMethods().some(m => m.toLowerCase() === identifier.text.toLowerCase());
        });

        if (!pathDecorators.length) { return; }
        if (pathDecorators.length > 1) {
            throw new Error(`Only one path decorator allowed per method. Found: ${pathDecorators.map(d => d.text).join(', ')}`);
        }

        const decorator = pathDecorators[0];
        const expression = decorator.parent as ts.CallExpression;
        const decoratorArgument = expression.arguments[0] as ts.StringLiteral;

        this.method = decorator.text.toLowerCase();
        // if you don't pass in a path to the method decorator, we'll just use the base route
        // todo: what if someone has multiple no argument methods of the same type in a single controller?
        // we need to throw an error there
        this.path = decoratorArgument ? `/${decoratorArgument.text}` : '';
    }

    private getDecorators(isMatching: (identifier: ts.Identifier) => boolean) {
        const decorators = this.node.decorators;
        if (!decorators || !decorators.length) { return; }

        return decorators
            .map(d => d.expression as ts.CallExpression)
            .map(e => e.expression as ts.Identifier)
            .filter(isMatching);
    }

    private getValidMethods() {
        return ['get', 'post', 'patch', 'delete', 'put'];
    }

    private getMethodDescription() {
        let symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(this.node.name);

        let comments = symbol.getDocumentationComment();
        if (comments.length) { return ts.displayPartsToString(comments); }

        return '';
    }

    // private getMethodParameters() {
    //     let hasBodyParameter = false;
    //     return this.node.parameters.map(p => {
    //         const parameter = new ApiMethodParameter(p, this.path, this.method, hasBodyParameter).getParameter();
    //         if (parameter.in === 'body') { hasBodyParameter = true; }

    //         return parameter;
    //     });
    // }

    // private get200Operation(swaggerType: Swagger.Schema) {
    //     return {
    //         produces: ['application/json'],
    //         responses: {
    //             '200': {
    //                 description: '',
    //                 examples: this.getMethodExample(),
    //                 schema: swaggerType
    //             }
    //         }
    //     };
    // }

    // private get204Operation() {
    //     return {
    //         responses: {
    //             '204': { description: 'No content' }
    //         }
    //     };
    // }

    private getMethodExample() {
        const exampleDecorators = this.getDecorators(identifier => identifier.text === 'Example');
        if (!exampleDecorators.length) { return undefined; }
        if (exampleDecorators.length > 1) {
            throw new Error('Only one Example decorator allowed per controller method.');
        }

        const example: any = {};
        const decorator = exampleDecorators[0];
        const expression = decorator.parent as ts.CallExpression;
        const argument = expression.arguments[0] as any;

        argument.properties.forEach((p: any) => {
            example[p.name.text] = this.getInitializerValue(p.initializer);
        });

        return example;
    }

    private getInitializerValue(initializer: any) {
        switch (initializer.kind as ts.SyntaxKind) {
            case ts.SyntaxKind.ArrayLiteralExpression:
                return initializer.elements.map((e: any) => this.getInitializerValue(e));
            case ts.SyntaxKind.StringLiteral:
                return initializer.text;
            case ts.SyntaxKind.TrueKeyword:
                return true;
            case ts.SyntaxKind.FalseKeyword:
                return false;
            case ts.SyntaxKind.NumberKeyword:
            case ts.SyntaxKind.FirstLiteralToken:
                return parseInt(initializer.text, 10);
            case ts.SyntaxKind.ObjectLiteralExpression:
                const nestedObject: any = {};

                initializer.properties.forEach((p: any) => {
                    nestedObject[p.name.text] = this.getInitializerValue(p.initializer);
                });

                return nestedObject;
            default:
                return undefined;
        }
    }
}
