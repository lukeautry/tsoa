import * as ts from 'typescript';
import { getDecoratorName, getDecoratorTextValue } from './../utils/decoratorUtils';
import { getValidateDecorators } from './../utils/validatorUtils';
import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { ResolveType } from './resolveType';
import { Tsoa } from './tsoa';

export class ParameterGenerator {
  constructor(
    private readonly parameter: ts.ParameterDeclaration,
    private readonly method: string,
    private readonly path: string,
  ) { }

  public Generate(): Tsoa.Parameter {
    const decoratorName = getDecoratorName(this.parameter, (identifier) => this.supportParameterDecorator(identifier.text));

    switch (decoratorName) {
      case 'UploadFile':
      case 'tsoa.UploadFile':
        return this.getUploadFieldParameter(this.parameter);
      case 'Request':
      case 'tsoa.Request':
        return this.getRequestParameter(this.parameter);
      case 'Body':
      case 'tsoa.Body':
        return this.getBodyParameter(this.parameter);
      case 'FormData':
      case 'tsoa.FormData':
        return this.getFormDataParameter(this.parameter);
      case 'BodyProp':
      case 'tsoa.BodyProp':
        return this.getBodyPropParameter(this.parameter);
      case 'Header':
      case 'tsoaHeader':
        return this.getHeaderParameter(this.parameter);
      case 'Query':
      case 'tsoa.Query':
        return this.getQueryParameter(this.parameter);
      case 'Path':
      case 'tsoa.Path':
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

  private getUploadFieldParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    return {
      description: this.getParameterDescription(parameter),
      in: 'formData',
      name: parameterName,
      parameterName,
      required: !parameter.questionToken,
      type: { dataType: 'file' },
      validators: getValidateDecorators(this.parameter),
    };
  }

  private getFormDataParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    return {
      description: this.getParameterDescription(parameter),
      in: 'formData',
      name: parameterName,
      parameterName,
      required: !parameter.questionToken,
      type,
      validators: getValidateDecorators(this.parameter),
    };
  }

  private getRequestParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;

    return {
      description: this.getParameterDescription(parameter),
      in: 'request',
      name: parameterName,
      parameterName,
      required: !parameter.questionToken,
      type: { dataType: 'object' },
      validators: getValidateDecorators(this.parameter),
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
      name: getDecoratorTextValue(this.parameter, (ident) => ident.text === 'BodyProp') || parameterName,
      parameterName,
      required: !parameter.questionToken,
      type,
      validators: getValidateDecorators(this.parameter),
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
      required: !parameter.questionToken,
      type,
      validators: getValidateDecorators(this.parameter),
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
      name: getDecoratorTextValue(this.parameter, (ident) => ident.text === 'Header') || parameterName,
      parameterName,
      required: !parameter.questionToken,
      type,
      validators: getValidateDecorators(this.parameter),
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
      name: getDecoratorTextValue(this.parameter, (ident) => ident.text === 'Query') || parameterName,
      parameterName,
      required: !parameter.questionToken,
      type,
      validators: getValidateDecorators(this.parameter),
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
      description: this.getParameterDescription(parameter),
      in: 'path',
      name: pathName,
      parameterName,
      required: true,
      type,
      validators: getValidateDecorators(this.parameter),
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
    return [
      'post', 'put', 'patch',
      'tsoa.post', 'tsoa.put', 'tsoa.patch',
    ].indexOf(method.toLowerCase()) >= -1;
  }

  private supportParameterDecorator(decoratorName: string) {
    return [
      'header', 'tsoa.header', 'query', 'tsoa.query', 'parem',  'tsoa.parem',
      'body', 'tsoa.body', 'bodyprop', 'tsoa.bodyprop', 'request', 'tsoa.request',
      'uploadfile', 'tsoa.uploadfile', 'formdata', 'tsoa.formdata',
    ].indexOf(decoratorName.toLocaleLowerCase()) >= -1;
  }

  private supportPathDataType(parameterType: Tsoa.Type) {
    return ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum', 'any'].find((t) => t === parameterType.dataType);
  }

  private getValidatedType(parameter: ts.ParameterDeclaration, extractEnum = true) {
    if (!parameter.type) {
      throw new GenerateMetadataError(`Parameter ${parameter.name} doesn't have a valid type assigned in '${this.getCurrentLocation()}'.`);
    }
    return ResolveType(parameter.type, extractEnum);
  }
}
