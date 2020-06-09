import * as ts from 'typescript';
import { getDecorators, getNodeFirstDecoratorName, getNodeFirstDecoratorValue } from './../utils/decoratorUtils';
import { getJSDocTags } from './../utils/jsDocUtils';
import { getParameterValidators } from './../utils/validatorUtils';
import { GenerateMetadataError } from './exceptions';
import { getInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from './tsoa';
import { TypeResolver } from './typeResolver';

export class ParameterGenerator {
  constructor(private readonly parameter: ts.ParameterDeclaration, private readonly method: string, private readonly path: string, private readonly current: MetadataGenerator) {}

  public Generate(): Tsoa.Parameter | null {
    const decoratorName = getNodeFirstDecoratorName(this.parameter, identifier => this.supportParameterDecorator(identifier.text));

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
      case 'Res':
        return this.getResParameter(this.parameter);
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

  private getResParameter(parameter: ts.ParameterDeclaration): Tsoa.ResParameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const decorator = getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Res') || parameterName;
    if (!decorator) {
      throw new GenerateMetadataError('Could not find Decorator', parameter);
    }

    const typeNode = parameter.type;

    if (!typeNode || !ts.isTypeReferenceNode(typeNode) || typeNode.typeName.getText() !== 'TsoaResponse') {
      throw new GenerateMetadataError('@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>', parameter);
    }

    if (!typeNode.typeArguments || !typeNode.typeArguments[0]) {
      throw new GenerateMetadataError('@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>', parameter);
    }

    const statusArgument = typeNode.typeArguments[0];
    const statusArgumentType = this.current.typeChecker.getTypeAtLocation(statusArgument);

    const isNumberLiteralType = (tsType: ts.Type): tsType is ts.NumberLiteralType => {
      // tslint:disable-next-line:no-bitwise
      return (tsType.getFlags() & ts.TypeFlags.NumberLiteral) !== 0;
    };

    if (!isNumberLiteralType(statusArgumentType)) {
      throw new GenerateMetadataError('@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>', parameter);
    }

    const status = statusArgumentType.value + '';

    const type = new TypeResolver(typeNode.typeArguments[1], this.current, typeNode).resolve();

    return {
      description: this.getParameterDescription(parameter) || '',
      in: 'res',
      name: status,
      parameterName,
      examples: this.getParameterExample(parameter, parameterName),
      required: true,
      type,
      schema: type,
      validators: {},
    };
  }

  private getBodyPropParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportBodyMethod(this.method)) {
      throw new GenerateMetadataError(`@BodyProp('${parameterName}') Can't support in ${this.method.toUpperCase()} method.`);
    }

    return {
      default: getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example: this.getParameterExample(parameter, parameterName),
      in: 'body-prop',
      name: getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'BodyProp') || parameterName,
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
      example: this.getParameterExample(parameter, parameterName),
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getHeaderParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Header('${parameterName}') Can't support '${type.dataType}' type.`);
    }

    return {
      default: getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example: this.getParameterExample(parameter, parameterName),
      in: 'header',
      name: getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Header') || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
    };
  }

  private getQueryParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter | null {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    const commonProperties = {
      default: getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example: this.getParameterExample(parameter, parameterName),
      in: 'query' as 'query',
      name: getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Query') || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      validators: getParameterValidators(this.parameter, parameterName),
    };

    if (this.getQueryParamterIsHidden(parameter)) {
      if (commonProperties.required) {
        throw new GenerateMetadataError(`@Query('${parameterName}') Can't support @Hidden because it is required (does not allow undefined and does not have a default value).`);
      }
      return null;
    }

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

    const type = this.getValidatedType(parameter);
    const pathName = getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Path') || parameterName;

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Path('${parameterName}') Can't support '${type.dataType}' type.`);
    }
    if (!this.path.includes(`{${pathName}}`) && !this.path.includes(`:${pathName}`)) {
      throw new GenerateMetadataError(`@Path('${parameterName}') Can't match in URL: '${this.path}'.`);
    }

    return {
      default: getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example: this.getParameterExample(parameter, parameterName),
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
    if (!symbol) {
      return undefined;
    }

    const comments = symbol.getDocumentationComment(this.current.typeChecker);
    if (comments.length) {
      return ts.displayPartsToString(comments);
    }

    return undefined;
  }

  private getParameterExample(node: ts.ParameterDeclaration, parameterName: string) {
    const examples = getJSDocTags(node.parent, tag => (tag.tagName.text === 'example' || tag.tagName.escapedText === 'example') && !!tag.comment && tag.comment.startsWith(parameterName)).map(tag =>
      (tag.comment || '').replace(`${parameterName} `, '').replace(/\r/g, ''),
    );

    if (examples.length === 0) {
      return undefined;
    } else {
      try {
        return examples.map(example => JSON.parse(example));
      } catch (e) {
        throw new GenerateMetadataError(`JSON format is incorrect: ${e.message}`);
      }
    }
  }

  private supportBodyMethod(method: string) {
    return ['post', 'put', 'patch', 'delete'].some(m => m === method.toLowerCase());
  }

  private supportParameterDecorator(decoratorName: string) {
    return ['header', 'query', 'path', 'body', 'bodyprop', 'request', 'res'].some(d => d === decoratorName.toLocaleLowerCase());
  }

  private supportPathDataType(parameterType: Tsoa.Type) {
    const supportedPathDataTypes: Tsoa.TypeStringLiteral[] = ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum', 'refEnum', 'any'];
    if (supportedPathDataTypes.find(t => t === parameterType.dataType)) {
      return true;
    }

    if (parameterType.dataType === 'refAlias') {
      return this.supportPathDataType(parameterType.type);
    }

    if (parameterType.dataType === 'union') {
      return !parameterType.types.map(t => this.supportPathDataType(t)).some(t => t === false);
    }

    return false;
  }

  private getValidatedType(parameter: ts.ParameterDeclaration) {
    let typeNode = parameter.type;
    if (!typeNode) {
      const type = this.current.typeChecker.getTypeAtLocation(parameter);
      typeNode = this.current.typeChecker.typeToTypeNode(type) as ts.TypeNode;
    }
    return new TypeResolver(typeNode, this.current, parameter).resolve();
  }

  private getQueryParamterIsHidden(parameter: ts.ParameterDeclaration) {
    const hiddenDecorators = getDecorators(parameter, identifier => identifier.text === 'Hidden');
    if (!hiddenDecorators || !hiddenDecorators.length) {
      return false;
    }

    if (hiddenDecorators.length > 1) {
      const parameterName = (parameter.name as ts.Identifier).text;
      throw new GenerateMetadataError(`Only one Hidden decorator allowed on @Query('${parameterName}').`);
    }

    return true;
  }
}
