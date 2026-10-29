import * as ts from '../ts';
import { printType, typeOfTypeNode } from './syntheticChildType';
import { getDecorators, getNodeFirstDecoratorName, getNodeFirstDecoratorValue, isDecorator } from './../utils/decoratorUtils';
import { commentToString, getJSDocTags, getSymbolDocumentation, isExistJSDocTag } from './../utils/jsDocUtils';
import { getParameterValidators } from './../utils/validatorUtils';
import { GenerateMetadataError } from './exceptions';
import { getInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from '@tsoa/runtime';
import { TypeResolver } from './typeResolver';
import { getHeaderType } from '../utils/headerTypeHelpers';

export class ParameterGenerator {
  constructor(
    private readonly parameter: ts.ParameterDeclaration,
    private readonly method: string,
    private readonly path: string,
    private readonly current: MetadataGenerator,
  ) {}

  public *Generate(): ts.Op<Tsoa.Parameter[]> {
    const decoratorName = getNodeFirstDecoratorName(this.parameter, identifier => this.supportParameterDecorator(identifier.text));

    switch (decoratorName) {
      case 'Request':
        return [yield* this.getRequestParameter(this.parameter)];
      case 'RequestProp':
        return [yield* this.getRequestPropParameter(this.parameter)];
      case 'Body':
        return [yield* this.getBodyParameter(this.parameter)];
      case 'BodyProp':
        return [yield* this.getBodyPropParameter(this.parameter)];
      case 'FormField':
        return [yield* this.getFormFieldParameter(this.parameter)];
      case 'Header':
        return [yield* this.getHeaderParameter(this.parameter)];
      case 'Query':
        return yield* this.getQueryParameters(this.parameter);
      case 'Queries':
        return [yield* this.getQueriesParameters(this.parameter)];
      case 'Path':
        return [yield* this.getPathParameter(this.parameter)];
      case 'Res':
        return yield* this.getResParameters(this.parameter);
      case 'Inject':
        return [];
      case 'UploadedFile':
        return [yield* this.getUploadedFileParameter(this.parameter)];
      case 'UploadedFiles':
        return [yield* this.getUploadedFileParameter(this.parameter, true)];
      default:
        return [yield* this.getPathParameter(this.parameter)];
    }
  }

  private *getRequestParameter(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.Parameter> {
    const parameterName = (parameter.name as ts.Identifier).text;
    return {
      description: yield* this.getParameterDescription(parameter),
      in: 'request',
      name: parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type: { dataType: 'object' },
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private *getRequestPropParameter(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.Parameter> {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = yield* this.getValidatedType(parameter);

    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);
    return {
      default: yield* getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: yield* this.getParameterDescription(parameter),
      example,
      exampleLabels,
      in: 'request-prop',
      name: (yield* getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'ParameterProp')) || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private *extractTsoaResponse(typeNode: ts.TypeNode | undefined): ts.Op<ts.TypeReferenceNode | undefined> {
    if (!typeNode || !ts.isTypeReferenceNode(typeNode)) {
      return undefined;
    }
    if (typeNode.typeName.getText() === 'TsoaResponse') {
      return typeNode;
    }

    const symbol = yield* (yield* this.current.typeChecker.getTypeAtLocation.gen(typeNode)).getAliasSymbol.gen();
    const declaration = symbol && (yield* ts.getDeclarations(symbol))[0];
    if (!declaration || !ts.isTypeAliasDeclaration(declaration) || !ts.isTypeReferenceNode(declaration.type)) {
      return undefined;
    }

    return declaration.type.typeName.getText() === 'TsoaResponse' ? declaration.type : undefined;
  }

  private *getResParameters(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.ResParameter[]> {
    const parameterName = (parameter.name as ts.Identifier).text;
    const decorator = (yield* getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Res')) || parameterName;
    if (!decorator) {
      throw new GenerateMetadataError('Could not find Decorator', parameter);
    }

    const typeNode = yield* this.extractTsoaResponse(parameter.type);

    if (!typeNode) {
      throw new GenerateMetadataError('@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>', parameter);
    }

    if (!typeNode.typeArguments || !typeNode.typeArguments[0]) {
      throw new GenerateMetadataError('@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>', parameter);
    }

    const statusArgument = typeNode.typeArguments[0];
    const bodyArgument = typeNode.typeArguments[1];

    // support a union of status codes, all with the same response body
    const statusArguments = ts.isUnionTypeNode(statusArgument) ? [...statusArgument.types] : [statusArgument];
    const statusArgumentTypes = yield* ts.map(statusArguments, a => this.current.typeChecker.getTypeAtLocation.gen(a));

    const isNumberLiteralType = (tsType: ts.Type): tsType is ts.NumberLiteralType => {
      // eslint-disable-next-line no-bitwise
      return (tsType.flags & ts.TypeFlags.NumberLiteral) !== 0;
    };

    const headers = yield* getHeaderType(typeNode.typeArguments, 2, this.current);

    return yield* ts.map(
      statusArgumentTypes,
      function* (this: ParameterGenerator, statusArgumentType: ts.Type): ts.Op<Tsoa.ResParameter> {
        if (!isNumberLiteralType(statusArgumentType)) {
          throw new GenerateMetadataError('@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>', parameter);
        }

        const status = String(statusArgumentType.value);

        const type = yield* new TypeResolver(bodyArgument, this.current, typeNode).resolve();
        const { examples, exampleLabels } = this.getParameterExample(parameter, parameterName);
        return {
          description: (yield* this.getParameterDescription(parameter)) || '',
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
      }.bind(this),
    );
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

  private *getBodyPropParameter(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.Parameter> {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = yield* this.getValidatedType(parameter);

    if (!this.supportBodyMethod(this.method)) {
      throw new GenerateMetadataError(`@BodyProp('${parameterName}') Can't support in ${this.method.toUpperCase()} method.`);
    }
    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);
    return {
      default: yield* getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: yield* this.getParameterDescription(parameter),
      example,
      exampleLabels,
      in: 'body-prop',
      name: (yield* getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'BodyProp')) || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private *getBodyParameter(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.Parameter> {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type: Tsoa.Type = this.isReadableType(parameter) ? { dataType: 'binary' } : yield* this.getValidatedType(parameter);

    if (!this.supportBodyMethod(this.method)) {
      throw new GenerateMetadataError(`@Body('${parameterName}') Can't support in ${this.method.toUpperCase()} method.`);
    }

    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);

    return {
      description: yield* this.getParameterDescription(parameter),
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

  private *getHeaderParameter(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.Parameter> {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = yield* this.getValidatedType(parameter);

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Header('${parameterName}') Can't support '${type.dataType}' type.`);
    }

    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);

    return {
      default: yield* getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: yield* this.getParameterDescription(parameter),
      example,
      exampleLabels,
      in: 'header',
      name: (yield* getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Header')) || parameterName,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private *getUploadedFileParameter(parameter: ts.ParameterDeclaration, isArray?: boolean): ts.Op<Tsoa.Parameter> {
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
      description: yield* this.getParameterDescription(parameter),
      in: 'formData',
      name:
        (yield* getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => {
          if (isArray) {
            return ident.text === 'UploadedFiles';
          }
          return ident.text === 'UploadedFile';
        })) ?? parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private *getFormFieldParameter(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.Parameter> {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = yield* this.getValidatedType(parameter);

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`Parameter '${parameterName}:${type.dataType}' can't be passed as form field parameter in '${this.method.toUpperCase()}'.`, parameter);
    }

    return {
      description: yield* this.getParameterDescription(parameter),
      in: 'formData',
      name: (yield* getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'FormField')) ?? parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type,
      parameterName,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  private *getQueriesParameters(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.Parameter> {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = yield* this.getValidatedType(parameter);

    const queriesType = yield* this.resolveQueriesType(type, parameterName, parameter);

    for (const property of queriesType.properties) {
      this.validateQueriesProperties(property, parameterName);
    }

    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);

    return {
      description: yield* this.getParameterDescription(parameter),
      in: 'queries',
      name: parameterName,
      example,
      exampleLabels,
      parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type: queriesType,
      validators: getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  }

  /**
   * Resolves the type for @Queries, unwrapping refAlias types (TypeScript type aliases)
   * to their underlying object type when possible.
   */
  private *resolveQueriesType(type: Tsoa.Type, parameterName: string, parameter: ts.ParameterDeclaration): ts.Op<Tsoa.RefObjectType | Tsoa.NestedObjectLiteralType> {
    if (type.dataType === 'refObject' || type.dataType === 'nestedObjectLiteral') {
      return type;
    }

    // Unwrap refAlias (TypeScript `type` aliases) to check the underlying type
    if (type.dataType === 'refAlias') {
      let unwrapped: Tsoa.Type = type.type;
      while (unwrapped.dataType === 'refAlias') {
        unwrapped = unwrapped.type;
      }
      if (unwrapped.dataType === 'refObject' || unwrapped.dataType === 'nestedObjectLiteral') {
        return unwrapped;
      }
    }

    // Handle cases where TypeResolver doesn't properly resolve complex types
    // like Zod's z.infer types to refObject or nestedObjectLiteral
    let typeNode = parameter.type;
    if (!typeNode) {
      const typeFromChecker = yield* this.current.typeChecker.getTypeAtLocation.gen(parameter);
      typeNode = yield* printType(this.current.typeChecker, typeFromChecker);
    }

    if (typeNode && ts.isTypeReferenceNode(typeNode)) {
      try {
        const actualType = yield* typeOfTypeNode(this.current.typeChecker, typeNode);
        const typeNodeFromType = actualType && (yield* printType(this.current.typeChecker, actualType));
        if (!typeNodeFromType) {
          throw new GenerateMetadataError(`Could not determine the type of ${yield* ts.nodeText(typeNode)}`, typeNode);
        }
        const resolvedType = yield* new TypeResolver(typeNodeFromType, this.current, parameter).resolve();

        if (resolvedType.dataType === 'refObject' || resolvedType.dataType === 'nestedObjectLiteral') {
          return resolvedType;
        }
      } catch (error) {
        console.warn(`Failed to resolve complex type for @Queries('${parameterName}'):`, error);
      }
    }

    throw new GenerateMetadataError(`@Queries('${parameterName}') only support 'refObject' or 'nestedObjectLiteral' types. If you want only one query parameter, please use the '@Query' decorator.`);
  }

  private validateQueriesProperties(property: Tsoa.Property, parentName: string) {
    if (property.type.dataType === 'array') {
      const arrayType = property.type;
      if (arrayType.elementType.dataType === 'nestedObjectLiteral') {
        // For arrays of nestedObjectLiteral, validate each property recursively
        const nestedType = arrayType.elementType;
        if (nestedType.properties) {
          for (const nestedProperty of nestedType.properties) {
            this.validateQueriesProperties(nestedProperty, `${parentName}.${property.name}[]`);
          }
        }
      } else if (!this.supportPathDataType(arrayType.elementType)) {
        throw new GenerateMetadataError(`@Queries('${parentName}') property '${property.name}' can't support array '${arrayType.elementType.dataType}' type.`);
      }
    } else if (property.type.dataType === 'nestedObjectLiteral') {
      // For nestedObjectLiteral, validate each property recursively
      const nestedType = property.type;
      if (nestedType.properties) {
        for (const nestedProperty of nestedType.properties) {
          this.validateQueriesProperties(nestedProperty, `${parentName}.${property.name}`);
        }
      }
    } else if (!this.supportPathDataType(property.type)) {
      throw new GenerateMetadataError(`@Queries('${parentName}') nested property '${property.name}' Can't support '${property.type.dataType}' type.`);
    }
  }

  private *getQueryParameters(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.Parameter[]> {
    const parameterName = (parameter.name as ts.Identifier).text;
    const type = yield* this.getValidatedType(parameter);

    const { examples: example, exampleLabels } = this.getParameterExample(parameter, parameterName);

    const commonProperties = {
      default: yield* getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: yield* this.getParameterDescription(parameter),
      example,
      exampleLabels,
      in: 'query' as const,
      name: (yield* getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Query')) || parameterName,
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

  private *getPathParameter(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.Parameter> {
    const parameterName = (parameter.name as ts.Identifier).text;

    const type = yield* this.getValidatedType(parameter);
    const pathName = String((yield* getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, ident => ident.text === 'Path')) || parameterName);

    if (!this.supportPathDataType(type)) {
      throw new GenerateMetadataError(`@Path('${parameterName}') Can't support '${type.dataType}' type.`);
    }
    if (!this.path.includes(`{${pathName}}`) && !this.path.includes(`:${pathName}`)) {
      throw new GenerateMetadataError(`@Path('${parameterName}') Can't match in URL: '${this.path}'.`);
    }
    const { examples, exampleLabels } = this.getParameterExample(parameter, parameterName);
    return {
      default: yield* getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: yield* this.getParameterDescription(parameter),
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

  private *getParameterDescription(node: ts.ParameterDeclaration): ts.Op<string | undefined> {
    const symbol = yield* this.current.typeChecker.getSymbolAtLocation.gen(node.name);
    if (!symbol) {
      return undefined;
    }

    return yield* getSymbolDocumentation(symbol, this.current.typeChecker);
  }

  private getParameterDeprecation(node: ts.ParameterDeclaration) {
    return isExistJSDocTag(node, tag => tag.tagName.text === 'deprecated') || isDecorator(node, identifier => identifier.text === 'Deprecated');
  }

  private getParameterExample(node: ts.ParameterDeclaration, parameterName: string) {
    const exampleLabels: Array<string | undefined> = [];
    const examples = getJSDocTags(node.parent, tag => {
      const comment = commentToString(tag.comment);
      const isExample = (tag.tagName.text === 'example' || tag.tagName.text === 'example') && !!tag.comment && comment?.startsWith(parameterName);

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
    return ['header', 'query', 'queries', 'path', 'body', 'bodyprop', 'request', 'requestprop', 'res', 'inject', 'uploadedfile', 'uploadedfiles', 'formfield'].some(
      d => d === decoratorName.toLocaleLowerCase(),
    );
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
      // skip undefined inside unions
      return !parameterType.types.map(t => t.dataType === 'undefined' || this.supportPathDataType(t)).some(t => t === false);
    }

    return false;
  }

  private isReadableType(parameter: ts.ParameterDeclaration): boolean {
    const typeNode = parameter.type;
    return !!typeNode && ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName) && typeNode.typeName.text === 'Readable';
  }

  private *getValidatedType(parameter: ts.ParameterDeclaration): ts.Op<Tsoa.Type> {
    let typeNode = parameter.type;
    if (!typeNode) {
      const type = yield* this.current.typeChecker.getTypeAtLocation.gen(parameter);
      typeNode = (yield* printType(this.current.typeChecker, type))!;
    }
    return yield* new TypeResolver(typeNode, this.current, parameter).resolve();
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
