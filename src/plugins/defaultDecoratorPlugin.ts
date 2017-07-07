import * as ts from 'typescript';

import { ResponseType, Type } from '../metadataGeneration/types';

import { DecoratorPlugin } from './DecoratorPlugin';
import { GenerateMetadataError } from '../metadataGeneration/exceptions';
import { ResolveType } from '../metadataGeneration/resolveType';
import { getInitializerValue } from '../utils/decoratorUtils';
import { getPhase } from '../utils/statusCodes';

export let defaultDecoratorPlugin: DecoratorPlugin = {
    defaultParameterIdentifier: { name: 'Path', type: 'path' },
    exampleIdentifiers: ['Example'],
    methodActionIdentifiers: ['Get', 'Post', 'Patch', 'Put', 'Delete'],
    parameterIdentifiers: [
        { name: 'Request', type: 'request' },
        { name: 'Body', type: 'body' },
        { name: 'BodyProp', type: 'body-prop' },
        { name: 'Header', type: 'header' },
        { name: 'Query', type: 'query' },
        { name: 'Path', type: 'path' },
    ],
    produceIdentifiers: [] as string[],
    responseIdentifiers: ['Response', 'SuccessResponse'],
    routeIdentifiers: ['Route'],
    securityIdentifiers: ['Security'],
    tagIdentifiers: ['Tags'],
    getExample(expression: ts.CallExpression) {
        const argument = expression.arguments[0] as any;
        return getExamplesValue(argument);
    },
    getRoutePrefix(expression: ts.CallExpression) {
        const value = expression.arguments[0] as ts.StringLiteral;
        return value ? value.text : '';
    },
    getMethodAction(expression: ts.CallExpression) {
        const decoratorArgument = expression.arguments[0] as ts.StringLiteral;
        const decorator = expression.expression as ts.Identifier;

        return {
            method: decorator.text.toLowerCase(),
            path: decoratorArgument ? `/${decoratorArgument.text}` : ''
        };
    },
    getMethodResponse(expression: ts.CallExpression, returnType: Type) {
        const decorator = expression.expression as ts.Identifier;
        const isSuccessResponse = decorator.text === 'SuccessResponse';
        const code = isSuccessResponse ? (returnType.typeName === 'void' ? 204 : 200) : 400;
        let name = code.toString();
        let description = getPhase(code);
        let examples = undefined;
        let schema = isSuccessResponse ? returnType : undefined;
        if (expression.arguments.length > 0 && (expression.arguments[0] as any).text) {
            name = (expression.arguments[0] as any).text;
        }
        if (expression.arguments.length > 1 && (expression.arguments[1] as any).text) {
            description = (expression.arguments[1] as any).text;
        }
        if (expression.arguments.length > 2 && (expression.arguments[2] as any).text) {
            const argument = expression.arguments[2] as any;
            examples = getExamplesValue(argument);
        }
        if (!isSuccessResponse && expression.typeArguments && expression.typeArguments.length > 0) {
            schema = ResolveType(expression.typeArguments[0]);
        }

        return {
            code,
            description,
            examples,
            name,
            schema,
        } as ResponseType;
    },
    getMethodSecurities(expression: ts.CallExpression) {
        return {
            name: (expression.arguments[0] as any).text,
            scopes: expression.arguments[1] ? (expression.arguments[1] as any).elements.map((e: any) => e.text) : undefined
        };
    },
    getMethodTags(expression: ts.CallExpression) {
        return expression.arguments.map((a: any) => a.text);
    },
    getProduce(expression: ts.CallExpression): string {
        throw new GenerateMetadataError(expression, 'Produce is not supported.');
    },
};

function getExamplesValue(argument: any) {
    const example: any = {};
    argument.properties.forEach((p: any) => {
        example[p.name.text] = getInitializerValue(p.initializer);
    });
    return example;
}
