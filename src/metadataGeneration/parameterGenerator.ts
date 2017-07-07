import * as ts from 'typescript';

import { Parameter, Type } from './types';

import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { ResolveType } from './resolveType';
import { getDecoratorTextValue } from './../utils/decoratorUtils';
import { getDecorators } from '../utils/decoratorUtils';
import { getParameterValidators } from './../utils/validatorUtils';

export class ParameterGenerator {
  constructor(
    private readonly parameter: ts.ParameterDeclaration,
    private readonly method: string,
    private readonly path: string
  ) { }

  public Generate(): Parameter|null {
    const decorators = getDecorators(this.parameter, identifier => MetadataGenerator.current.decoratorPlugin.parameterIdentifiers.some(id => id.name === identifier.text));
    if (!decorators.length && !MetadataGenerator.current.decoratorPlugin.defaultParameterIdentifier) {
      return null;
    }
    const decorator = decorators[0];
    const paramIdentifier = decorator
      ? MetadataGenerator.current.decoratorPlugin.parameterIdentifiers.find(id => id.name === decorator.text)!
      : MetadataGenerator.current.decoratorPlugin.defaultParameterIdentifier!;

    switch (paramIdentifier.type) {
      case 'request':
        return this.getRequestParameter(this.parameter);
      case 'body':
        return this.getBodyParameter(this.parameter);
      case 'body-prop':
        return this.getBodyPropParameter(this.parameter);
      case 'header':
        return this.getHeaderParameter(this.parameter);
      case 'query':
        return this.getQueryParameter(this.parameter);
      case 'path':
        return this.getPathParameter(this.parameter);
      default:
        throw new GenerateMetadataError(this.parameter, `Type '${paramIdentifier.type}' is not supported in '${this.getCurrentLocation()}' method.`);
    }
  }

  private getCurrentLocation() {
    const methodId = (this.parameter.parent as ts.MethodDeclaration).name as ts.Identifier;
    const controllerId = ((this.parameter.parent as ts.MethodDeclaration).parent as ts.ClassDeclaration).name as ts.Identifier;
    return `${controllerId.text}.${methodId.text}`;
  }

  private getRequestParameter(parameter: ts.ParameterDeclaration): Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    return {
      description: this.getParameterDescription(parameter),
      in: 'request',
      name: parameterName,
      required: !parameter.questionToken,
      type: { typeName: 'object' },
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getBodyPropParameter(parameter: ts.ParameterDeclaration): Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportBodyMethod(this.method)) {
      throw new GenerateMetadataError(parameter, `Body can't support '${this.getCurrentLocation()}' method.`);
    }

    return {
      description: this.getParameterDescription(parameter),
      in: 'body-prop',
      name: getDecoratorTextValue(this.parameter, ident => ident.text === 'BodyProp') || parameterName,
      required: !parameter.questionToken,
      type: type,
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getBodyParameter(parameter: ts.ParameterDeclaration): Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportBodyMethod(this.method)) {
      throw new GenerateMetadataError(parameter, `Body can't support ${this.method} method`);
    }

    return {
      description: this.getParameterDescription(parameter),
      in: 'body',
      name: parameterName,
      required: !parameter.questionToken,
      type,
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getHeaderParameter(parameter: ts.ParameterDeclaration): Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(parameter, `Parameter '${parameterName}' can't be passed as a header parameter in '${this.getCurrentLocation()}'.`);
    }

    return {
      description: this.getParameterDescription(parameter),
      in: 'header',
      name: getDecoratorTextValue(this.parameter, ident => ident.text === 'Header') || parameterName,
      required: !parameter.questionToken,
      type,
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getQueryParameter(parameter: ts.ParameterDeclaration): Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(parameter, `Parameter '${parameterName}' can't be passed as a query parameter in '${this.getCurrentLocation()}'.`);
    }

    return {
      description: this.getParameterDescription(parameter),
      in: 'query',
      name: getDecoratorTextValue(this.parameter, ident => ident.text === 'Query') || parameterName,
      required: !parameter.questionToken,
      type,
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getPathParameter(parameter: ts.ParameterDeclaration): Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);
    const pathName = getDecoratorTextValue(this.parameter, ident => ident.text === 'Path') || parameterName;

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(parameter, `Parameter '${parameterName}:${type}' can't be passed as a path parameter in '${this.getCurrentLocation()}'.`);
    }
    if (!this.path.includes(`{${pathName}}`)) {
      throw new GenerateMetadataError(parameter, `Parameter '${parameterName}' can't match in path: '${this.path}'`);
    }

    return {
      description: this.getParameterDescription(parameter),
      in: 'path',
      name: pathName,
      required: true,
      type,
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getParameterDescription(node: ts.ParameterDeclaration) {
    const symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);
    if (!symbol) { return undefined; }

    const comments = symbol.getDocumentationComment();
    if (comments.length) { return ts.displayPartsToString(comments); }

    return undefined;
  }

  private supportBodyMethod(method: string) {
    return ['post', 'put', 'patch'].some(m => m === method.toLowerCase());
  }

  private supportPathDataType(parameterType: Type) {
    return ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum'].find(t => t === parameterType.typeName);
  }

  private getValidatedType(parameter: ts.ParameterDeclaration) {
    if (!parameter.type) {
      throw new GenerateMetadataError(parameter, `Parameter ${parameter.name} doesn't have a valid type assigned in '${this.getCurrentLocation()}'.`);
    }
    return ResolveType(parameter.type);
  }
}
