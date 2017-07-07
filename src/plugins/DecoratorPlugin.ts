import * as ts from 'typescript';

import { ResponseType, Type } from '../metadataGeneration/types';

export interface DecoratorPlugin {
    defaultParameterIdentifier?: { name: string, type: string };
    exampleIdentifiers: string[];
    methodActionIdentifiers: string[];
    parameterIdentifiers: { name: string, type: string }[];
    produceIdentifiers: string[];
    responseIdentifiers: string[];
    routeIdentifiers: string[];
    securityIdentifiers: string[];
    tagIdentifiers: string[];
    getExample(expression: ts.CallExpression): any;
    getMethodAction(expression: ts.CallExpression): { method: string, path: string };
    getMethodResponse(expression: ts.CallExpression, returnType: Type): ResponseType;
    getMethodSecurities(expression: ts.CallExpression): { name: string, scope?: string[] };
    getMethodTags(expression: ts.CallExpression): string[];
    getProduce(expression: ts.CallExpression): string;
    getRoutePrefix(expression: ts.CallExpression): string;
}
