import * as ts from 'typescript';
import { getDecorators, getNodeFirstDecoratorName, getNodeFirstDecoratorValue, isDecorator } from './../utils/decoratorUtils';
import { commentToString, getJSDocTags, isExistJSDocTag } from './../utils/jsDocUtils';
import { getParameterValidators } from './../utils/validatorUtils';
import { GenerateMetadataError } from './exceptions';
import { getInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from '@tsoa/runtime';
import { TypeResolver } from './typeResolver';
import { getHeaderType } from '../utils/headerTypeHelpers';

export class ParameterGenerator {
  constructor(private readonly parameter: ts.ParameterDeclaration, private readonly method: string, private readonly path: string, private readonly current: MetadataGenerator) {}

  public Generate(): Tsoa.Parameter[] {
    const decoratorName = getNodeFirstDecoratorName(this.parameter, identifier => this.supportParameterDecorator(identifier.text));

    switch (decoratorName) {
      case 'Request':
        return [this.getRequestParameter(this.parameter)];
      case 'Body':
        return [this.getBodyParameter(this.parameter)];
      case 'BodyProp':
        return [this.getBodyPropParameter(this.parameter)];
      case 'FormField':
        return [this.getFormFieldParameter(this.parameter)];
      case 'Header':
        return [this.getHeaderParameter(this.parameter)];
      case 'Query':
        return this.getQueryParameters(this.parameter);
      case 'Queries':
        return [this.getQueriesParameters(this.parameter)];
      case 'Path':
        return [this.getPathParameter(this.parameter)];
      case 'Res':
        return this.getResParameters(this.parameter);
      case 'Inject':
        return [];
      case 'UploadedFile':
        return [this.getUploadedFileParameter(this.parameter)];
      case 'UploadedFiles':
        return [this.getUploadedFileParameter(this.parameter, true)];
      default:
        return [this.getPathParameter(this.parameter)];
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
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private getResParameters(parameter: ts.ParameterDeclaration): Tsoa.ResParameter[] {
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
    const bodyArgument = typeNode.typeArguments[1];

    // support a union of status codes, all with the same response body
    const statusArguments = ts.isUnionTypeNode(statusArgument) ? [...statusArgument.types] : [statusArgument];
    const statusArgumentTypes = statusArguments.map(a => this.current.typeChecker.getTypeAtLocation(a));

    const isNumberLiteralType = (tsType: ts.Type): tsType is ts.NumberLiteralType => {
      // eslint-disable-next-line no-bitwise
      return (tsType.getFlags() & ts.TypeFlags.NumberLiteral) !== 0;
    };

    const headers = getHeaderType(typeNode.typeArguments, 2, this.current);

    return statusArgumentTypes.map(statusArgumentType => {
      if (!isNumberLiteralType(statusArgumentType)) {
        throw new GenerateMetadataError('@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>', parameter);
      }

      const status = String(statusArgumentType.value);

      const type = new TypeResolver(bodyArgument, this.current, typeNode).resolve();
      const { examples, exampleLabels } = this.getParameterExample(parameter, parameterName);
      return {
        description: this.getParameterDescription(parameter) || '',
        in: 'res',
        name: status,
        produces: headers ? this.getProducesFromResHeaders(headers) : undefined,
        parameterName,
        examples,
        required: true,
        type,
        exampleLabels,
        schema: type,
        validators: {},
        headers,
        deprecated: this.getParameterDeprecation(parameter),
      };
    });
  }

  private getProducesFromResHeaders(headers: Tsoa.HeaderType): string[] | undefined {
    const { properties } = headers;
    const [contentTypeProp] = (properties || []).filter(p => p.name.toLowerCase() === 'content-type' && p.type.dataType === 'enum');
    if (contentTypeProp) {
      const type = contentTypeProp.type as Tsoa.EnumType;
      return type.enums as string[];
    }
    return;
  }

  private getBodyPropParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportBodyMethod(this.method)) {
      throw new GenerateMetadataError(`@BodyProp('${parameterName}') Can't support in ${this.method.toUpperCase()} method.`);
    }
    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);
    return {
      default: getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example,
      exampleLabels,
      in: 'body-prop',
      name: getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'BodyProp') || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private getBodyParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportBodyMethod(this.method)) {
      throw new GenerateMetadataError(`@Body('${parameterName}') Can't support in ${this.method.toUpperCase()} method.`);
    }

    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);

    return {
      description: this.getParameterDescription(parameter),
      in: 'body',
      name: parameterName,
      example,
      exampleLabels,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private getHeaderParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Header('${parameterName}') Can't support '${type.dataType}' type.`);
    }

    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);

    return {
      default: getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example,
      exampleLabels,
      in: 'header',
      name: getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Header') || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private getUploadedFileParameter(parameter: ts.ParameterDeclaration, isArray?: boolean): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const elementType: Tsoa.Type = { dataType: 'file' };
    let type: Tsoa.Type;
    if (isArray) {
      type = { dataType: 'array', elementType };
    } else {
      type = elementType;
    }

    if (!this.supportPathDataType(elementType)) {
      throw new GenerateMetadataError(`Parameter '${parameterName}:${type.dataType}' can't be passed as an uploaded file(s) parameter in '${this.method.toUpperCase()}'.`, parameter);
    }

    return {
      description: this.getParameterDescription(parameter),
      in: 'formData',
      name:
        getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => {
          if (isArray) {
            return ident.text === 'UploadedFiles';
          }
          return ident.text === 'UploadedFile';
        }) ?? parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private getFormFieldParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type: Tsoa.Type = { dataType: 'string' };

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`Parameter '${parameterName}:${type.dataType}' can't be passed as form field parameter in '${this.method.toUpperCase()}'.`, parameter);
    }

    return {
      description: this.getParameterDescription(parameter),
      in: 'formData',
      name: getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'FormField') ?? parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private getQueriesParameters(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    if (type.dataType !== 'refObject' && type.dataType !== 'nestedObjectLiteral') {
      throw new GenerateMetadataError(`@Queries('${parameterName}') only support 'refObject' or 'nestedObjectLiteral' types. If you want only one query parameter, please use the '@Query' decorator.`);
    }

    for (const property of type.properties) {
      this.validateQueriesProperties(property, parameterName);
    }

    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);

    return {
      description: this.getParameterDescription(parameter),
      in: 'queries',
      name: parameterName,
      example,
      exampleLabels,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private validateQueriesProperties(property: Tsoa.Property, parentName: string) {
    if (property.type.dataType === 'array') {
      const arrayType = property.type;
      if (!this.supportPathDataType(arrayType.elementType)) {
        throw new GenerateMetadataError(`@Queries('${parentName}') property '${property.name}' can't support array '${arrayType.elementType.dataType}' type.`);
      }
    } else if (!this.supportPathDataType(property.type)) {
      throw new GenerateMetadataError(`@Queries('${parentName}') nested property '${property.name}' Can't support '${property.type.dataType}' type.`);
    }
  }

  private getQueryParameters(parameter: ts.ParameterDeclaration): Tsoa.Parameter[] {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = this.getValidatedType(parameter);

    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);

    const commonProperties = {
      default: getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example,
      exampleLabels,
      in: 'query' as const,
      name: getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Query') || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };

    if (this.getQueryParameterIsHidden(parameter)) {
      if (commonProperties.required) {
        throw new GenerateMetadataError(`@Query('${parameterName}') Can't support @Hidden because it is required (does not allow undefined and does not have a default value).`);
      }
      return [];
    }

    if (type.dataType === 'array') {
      const arrayType = type;
      if (!this.supportPathDataType(arrayType.elementType)) {
        throw new GenerateMetadataError(`@Query('${parameterName}') Can't support array '${arrayType.elementType.dataType}' type.`);
      }
      return [
        {
          ...commonProperties,
          collectionFormat: 'multi',
          type: arrayType,
        } as Tsoa.ArrayParameter,
      ];
    }

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Query('${parameterName}') Can't support '${type.dataType}' type.`);
    }

    return [
      {
        ...commonProperties,
        type,
      },
    ];
  }

  private getPathParameter(parameter: ts.ParameterDeclaration): Tsoa.Parameter {
    const parameterName = (parameter.name as ts.Identifier).text;

    const type = this.getValidatedType(parameter);
    const pathName = String(getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Path') || parameterName);

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Path('${parameterName}') Can't support '${type.dataType}' type.`);
    }
    if (!this.path.includes(`{${pathName}}`) && !this.path.includes(`:${pathName}`)) {
      throw new GenerateMetadataError(`@Path('${parameterName}') Can't match in URL: '${this.path}'.`);
    }
    const { examples, exampleLabels } = this.getParameterExample(parameter, parameterName);
    return {
      default: getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example: examples,
      exampleLabels,
      in: 'path',
      name: pathName,
      parameterName,
      required: true,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
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

  private getParameterDeprecation(node: ts.ParameterDeclaration) {
    return isExistJSDocTag(node, tag => tag.tagName.text === 'deprecated') || isDecorator(node, identifier => identifier.text === 'Deprecated');
  }

  private getParameterExample(node: ts.ParameterDeclaration, parameterName: string) {
    const exampleLabels: Array<string | undefined> = [];
    const examples = getJSDocTags(node.parent, tag => {
      const comment = commentToString(tag.comment);
      const isExample = (tag.tagName.text === 'example' || tag.tagName.escapedText === 'example') && !!tag.comment && comment?.startsWith(parameterName);

      if (isExample) {
        const hasExampleLabel = (comment?.split(' ')[0].indexOf('.') || -1) > 0;
        // custom example label is delimited by first '.' and the rest will all be included as example label
        exampleLabels.push(hasExampleLabel ? comment?.split(' ')[0].split('.').slice(1).join('.') : undefined);
      }
      return isExample ?? false;
    }).map(tag => (commentToString(tag.comment) || '').replace(`${commentToString(tag.comment)?.split(' ')[0] || ''}`, '').replace(/\r/g, ''));

    if (examples.length === 0) {
      return {
        examples: undefined,
        exampleLabels: undefined,
      };
    } else {
      try {
        return {
          examples: examples.map(example => JSON.parse(example)),
          exampleLabels,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        throw new GenerateMetadataError(`JSON format is incorrect: ${message}`);
      }
    }
  }

  private supportBodyMethod(method: string) {
    return ['post', 'put', 'patch', 'delete'].some(m => m === method.toLowerCase());
  }

  private supportParameterDecorator(decoratorName: string) {
    return ['header', 'query', 'queries', 'path', 'body', 'bodyprop', 'request', 'res', 'inject', 'uploadedfile', 'uploadedfiles', 'formfield'].some(d => d === decoratorName.toLocaleLowerCase());
  }

  private supportPathDataType(parameterType: Tsoa.Type): boolean {
    const supportedPathDataTypes: Tsoa.TypeStringLiteral[] = ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum', 'refEnum', 'file', 'any'];
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
      typeNode = this.current.typeChecker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
    }
    return new TypeResolver(typeNode, this.current, parameter).resolve();
  }

  private getQueryParameterIsHidden(parameter: ts.ParameterDeclaration) {
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
