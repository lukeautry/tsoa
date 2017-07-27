import * as ts from 'typescript';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from './tsoa';
import { ResolveType } from './resolveType';
import { GenerateMetadataError } from './exceptions';
import { getDecoratorName, getDecoratorTextValue } from './../utils/decoratorUtils';
import { getParameterValidators } from './../utils/validatorUtils';

export class ParameterGenerator {
  constructor(
    private readonly parameter: ts.ParameterDeclaration,
    private readonly method: string,
    private readonly path: string,
  ) { }

  public Generate(): Tsoa.Parameter {
    const decoratorName = getDecoratorName(this.parameter, identifier => this.supportParameterDecorator(identifier.text));

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

  private getCurrentLocation() {
    const methodId = (this.parameter.parent as ts.MethodDeclaration).name as ts.Identifier;
    const controllerId = ((this.parameter.parent as ts.MethodDeclaration).parent as ts.ClassDeclaration).name as ts.Identifier;
    return `${controllerId.text}.${methodId.text}`;
  }

  private getRequestParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    return {
      description: this.getParameterDescription(parameter),
      in: 'request',
      name: parameterName,
      required: !parameter.questionToken,
      type: { dataType: 'object' },
      parameterName,
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
      description: this.getParameterDescription(parameter),
      in: 'body-prop',
      name: getDecoratorTextValue(this.parameter, ident => ident.text === 'BodyProp') || parameterName,
      required: !parameter.questionToken,
      type: type,
      parameterName,
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
      required: !parameter.questionToken,
      type,
      parameterName,
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
      description: this.getParameterDescription(parameter),
      in: 'header',
      name: getDecoratorTextValue(this.parameter, ident => ident.text === 'Header') || parameterName,
      required: !parameter.questionToken,
      type,
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getQueryParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter, false);

    if (type.dataType === 'array') {
      const arrayType = type as Tsoa.ArrayType;

      if (!this.supportPathDataType(arrayType.elementType)) {
        throw new GenerateMetadataError(`@Query('${parameterName}') Can't support array '${arrayType.elementType.dataType}' type.`);
      }
    } else {
      if (!this.supportPathDataType(type)) {
        throw new GenerateMetadataError(`@Query('${parameterName}') Can't support '${type.dataType}' type.`);
      }
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

  private getPathParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter, false);
    const pathName = getDecoratorTextValue(this.parameter, ident => ident.text === 'Path') || parameterName;

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Path('${parameterName}') Can't support '${type.dataType}' type.`);
    }
    if (!this.path.includes(`{${pathName}}`)) {
      throw new GenerateMetadataError(`@Path('${parameterName}') Can't match in URL: '${this.path}'.`);
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

  private supportParameterDecorator(decoratorName: string) {
    return ['header', 'query', 'parem', 'body', 'bodyprop', 'request'].some(d => d === decoratorName.toLocaleLowerCase());
  }

  private supportPathDataType(parameterType: Tsoa.Type) {
    return ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum', 'any'].find(t => t === parameterType.dataType);
  }

  private getValidatedType(parameter: ts.ParameterDeclaration, extractEnum = true) {
    if (!parameter.type) {
      throw new GenerateMetadataError(`Parameter ${parameter.name} doesn't have a valid type assigned in '${this.getCurrentLocation()}'.`);
    }
    return ResolveType(parameter.type, extractEnum);
  }
}
