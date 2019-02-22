import * as ts from 'typescript';
import { getDecoratorName, getDecoratorTextValue } from './../utils/decoratorUtils';
import { getParameterValidators } from './../utils/validatorUtils';
import { GenerateMetadataError } from './exceptions';
import { getInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from './tsoa';
import { TypeResolver } from './typeResolver';

export class ParameterGenerator {
  constructor(
    private readonly parameter: ts.ParameterDeclaration,
    private readonly method: string,
    private readonly path: string,
    private readonly current: MetadataGenerator,
  ) { }

  public Generate(): Tsoa.Parameter {
    const decoratorName = getDecoratorName(this.parameter, (identifier) => this.supportParameterDecorator(identifier.text));

    switch (decoratorName) {
      case 'Request':
        return this.getRequestParameter(this.parameter);
      case 'Body':
        return this.getBodyParameter(this.parameter);
      case 'BodyProp':
        return this.getBodyPropParameter(this.parameter);
      case 'Header':
        return this.getHeaderParameter(this.parameter);
      case 'Query':
        return this.getQueryParameter(this.parameter);
      case 'Path':
        return this.getPathParameter(this.parameter);
      default:
        return this.getPathParameter(this.parameter);
    }
  }

  private getRequestParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    return {
      description: this.getParameterDescription(parameter),
      in: 'request',
      name: parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type: { dataType: 'object' },
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getBodyPropParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportBodyMethod(this.method)) {
      throw new GenerateMetadataError(`@BodyProp('${parameterName}') Can't support in ${this.method.toUpperCase()} method.`);
    }

    return {
      default: getInitializerValue(parameter.initializer, type),
      description: this.getParameterDescription(parameter),
      in: 'body-prop',
      name: getDecoratorTextValue(this.parameter, (ident) => ident.text === 'BodyProp') || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getBodyParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportBodyMethod(this.method)) {
      throw new GenerateMetadataError(`@Body('${parameterName}') Can't support in ${this.method.toUpperCase()} method.`);
    }

    return {
      description: this.getParameterDescription(parameter),
      in: 'body',
      name: parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getHeaderParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter, false);

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Header('${parameterName}') Can't support '${type.dataType}' type.`);
    }

    return {
      default: getInitializerValue(parameter.initializer, type),
      description: this.getParameterDescription(parameter),
      in: 'header',
      name: getDecoratorTextValue(this.parameter, (ident) => ident.text === 'Header') || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getQueryParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter, false);

    const commonProperties = {
      default: getInitializerValue(parameter.initializer, type),
      description: this.getParameterDescription(parameter),
      in: 'query' as 'query',
      name: getDecoratorTextValue(this.parameter, ident => ident.text === 'Query') || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      validators: getParameterValidators(this.parameter, parameterName),
    };

    if (type.dataType === 'array') {
      const arrayType = type as Tsoa.ArrayType;
      if (!this.supportPathDataType(arrayType.elementType)) {
        throw new GenerateMetadataError(`@Query('${parameterName}') Can't support array '${arrayType.elementType.dataType}' type.`);
      }
      return {
        ...commonProperties,
        collectionFormat: 'multi',
        type: arrayType,
      } as Tsoa.ArrayParameter;
    }

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Query('${parameterName}') Can't support '${type.dataType}' type.`);
    }

    return {
      ...commonProperties,
      type,
    };
  }

  private getPathParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter, false);
    const pathName = getDecoratorTextValue(this.parameter, (ident) => ident.text === 'Path') || parameterName;

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Path('${parameterName}') Can't support '${type.dataType}' type.`);
    }
    if (!this.path.includes(`{${pathName}}`)) {
      throw new GenerateMetadataError(`@Path('${parameterName}') Can't match in URL: '${this.path}'.`);
    }

    return {
      default: getInitializerValue(parameter.initializer, type),
      description: this.getParameterDescription(parameter),
      in: 'path',
      name: pathName,
      parameterName,
      required: true,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getParameterDescription(node: ts.ParameterDeclaration) {
    const symbol = this.current.typeChecker.getSymbolAtLocation(node.name);
    if (!symbol) { return undefined; }

    const comments = symbol.getDocumentationComment(this.current.typeChecker);
    if (comments.length) { return ts.displayPartsToString(comments); }

    return undefined;
  }

  private supportBodyMethod(method: string) {
    return ['post', 'put', 'patch'].some((m) => m === method.toLowerCase());
  }

  private supportParameterDecorator(decoratorName: string) {
    return ['header', 'query', 'parem', 'body', 'bodyprop', 'request'].some((d) => d === decoratorName.toLocaleLowerCase());
  }

  private supportPathDataType(parameterType: Tsoa.Type) {
    return ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum', 'any'].find((t) => t === parameterType.dataType);
  }

  private getValidatedType(parameter: ts.ParameterDeclaration, extractEnum = true) {
    let typeNode = parameter.type;
    if (!typeNode) {
      const type = this.current.typeChecker.getTypeAtLocation(parameter);
      typeNode = this.current.typeChecker.typeToTypeNode(type) as ts.TypeNode;
    }
    return new TypeResolver(typeNode, this.current, parameter, extractEnum).resolve();
  }
}
