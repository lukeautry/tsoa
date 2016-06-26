import {ApiMethodParameter} from './apiMethodParameter';
import {GetSwaggerType} from './typeConversion';
import {Method} from '../routing/method';
import {Swagger} from './swagger';
import {SwaggerGenerator} from './generator';
import * as ts from 'typescript';

export class ApiMethod {
    private method: string;
    private path: string;

    constructor(
        private node: ts.MethodDeclaration,
        private controllerPath: string,
        private typeChecker: ts.TypeChecker
    ) {
        this.processMethodDecorators();
    }

    public isValid() {
        return !!this.method;
    }

    public generate() {
        if (!this.isValid()) { throw new Error('This isn\'t a valid a controller method.'); }
        if (!this.node.type) { throw new Error('Controller methods must have a return type.'); }

        const swaggerType = GetSwaggerType(this.node.type);
        const pathObject: any = {};
        pathObject[this.method] = swaggerType ? this.get200Operation(swaggerType) : this.get204Operation();
        pathObject[this.method].description = this.getMethodDescription();
        pathObject[this.method].parameters = this.node.parameters
            .map(p => new ApiMethodParameter(p, this.path, this.method).getParameter());

        SwaggerGenerator.AddPath(`/${this.controllerPath}${this.path}`, pathObject);
    }

    private processMethodDecorators() {
        const decorators = this.node.decorators;
        if (!decorators || !decorators.length) { return; }

        const pathDecorators = decorators
            .map(d => d.expression as ts.CallExpression)
            .map(e => e.expression as ts.Identifier)
            .filter(identifier => this.getValidMethods().
                some(m => m.toLowerCase() === identifier.text.toLowerCase()));

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

    private getValidMethods() {
        const validMethods = new Array<string>();

        for (let member in Method) {
            const isValueProperty = parseInt(member, 10) >= 0;
            if (isValueProperty) {
                validMethods.push(Method[member]);
            }
        }

        return validMethods;
    }

    private get200Operation(swaggerType: Swagger.Schema) {
        return {
            produces: ['application/json'],
            responses: {
                '200': {
                    description: '',
                    schema: swaggerType
                }
            }
        };
    }

    private get204Operation() {
        return {
            responses: {
                '204': { description: 'No content' }
            }
        };
    }

    private getMethodDescription() {
        let symbol = this.typeChecker.getSymbolAtLocation(this.node.name);

        let comments = symbol.getDocumentationComment();
        if (comments.length) { return ts.displayPartsToString(comments); }

        return '';
    }
}
