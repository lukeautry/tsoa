import { Swagger, Tsoa, assertNever } from '@tsoa/runtime';
import { merge as mergeAnything } from 'merge-anything';
import { merge as deepMerge } from 'ts-deepmerge';

import { ExtendedSpecConfig } from '../cli';
import { isVoidType } from '../utils/isVoidType';
import { UnspecifiedObject } from '../utils/unspecifiedObject';
import { shouldIncludeValidatorInSchema } from '../utils/validatorUtils';
import { convertColonPathParams, normalisePath } from './../utils/pathUtils';
import { DEFAULT_REQUEST_MEDIA_TYPE, DEFAULT_RESPONSE_MEDIA_TYPE, getValue } from './../utils/swaggerUtils';
import { SpecGenerator } from './specGenerator';

export class SpecGenerator31 extends SpecGenerator {
  constructor(
    protected readonly metadata: Tsoa.Metadata,
    protected readonly config: ExtendedSpecConfig,
  ) {
    super(metadata, config);
  }

  public GetSpec() {
    let spec: Swagger.Spec31 = {
      openapi: '3.1.0',
      components: this.buildComponents(),
      info: this.buildInfo(),
      paths: this.buildPaths(),
      servers: this.buildServers(),
      tags: this.config.tags,
    };

    if (this.config.spec) {
      this.config.specMerging = this.config.specMerging || 'immediate';
      const mergeFuncs: { [key: string]: (spec: UnspecifiedObject, merge: UnspecifiedObject) => UnspecifiedObject } = {
        immediate: Object.assign,
        recursive: mergeAnything,
        deepmerge: (spec: UnspecifiedObject, merge: UnspecifiedObject): UnspecifiedObject => deepMerge(spec, merge),
      };

      spec = mergeFuncs[this.config.specMerging](spec as unknown as UnspecifiedObject, this.config.spec as UnspecifiedObject) as unknown as Swagger.Spec31;
    }

    return spec;
  }

  private buildInfo() {
    const info: Swagger.Info = {
      title: this.config.name || '',
    };
    if (this.config.version) {
      info.version = this.config.version;
    }
    if (this.config.description) {
      info.description = this.config.description;
    }
    if (this.config.termsOfService) {
      info.termsOfService = this.config.termsOfService;
    }
    if (this.config.license) {
      info.license = { name: this.config.license };
    }
    if (this.config.contact) {
      info.contact = this.config.contact;
    }

    return info;
  }

  private buildComponents() {
    const components = {
      examples: {},
      headers: {},
      parameters: {},
      requestBodies: {},
      responses: {},
      schemas: this.buildSchema(),
      securitySchemes: {},
    };

    if (this.config.securityDefinitions) {
      components.securitySchemes = this.translateSecurityDefinitions(this.config.securityDefinitions);
    }

    return components;
  }

  private translateSecurityDefinitions(definitions: { [name: string]: Swagger.SecuritySchemes }) {
    const defs: { [name: string]: Swagger.SecuritySchemes } = {};
    Object.keys(definitions).forEach(key => {
      if (definitions[key].type === 'basic') {
        defs[key] = {
          scheme: 'basic',
          type: 'http',
        } as Swagger.BasicSecurity3;
      } else if (definitions[key].type === 'oauth2') {
        /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
        const definition = definitions[key] as
          | Swagger.OAuth2PasswordSecurity
          | Swagger.OAuth2ApplicationSecurity
          | Swagger.OAuth2ImplicitSecurity
          | Swagger.OAuth2AccessCodeSecurity
          | Swagger.OAuth2Security3;
        const oauth = (defs[key] || {
          type: 'oauth2',
          description: definitions[key].description,
          flows: (this.hasOAuthFlows(definition) && definition.flows) || {},
        }) as Swagger.OAuth2Security3;

        if (this.hasOAuthFlow(definition) && definition.flow === 'password') {
          oauth.flows.password = { tokenUrl: definition.tokenUrl, scopes: definition.scopes || {} } as Swagger.OAuth2SecurityFlow3;
        } else if (this.hasOAuthFlow(definition) && definition.flow === 'accessCode') {
          oauth.flows.authorizationCode = { tokenUrl: definition.tokenUrl, authorizationUrl: definition.authorizationUrl, scopes: definition.scopes || {} } as Swagger.OAuth2SecurityFlow3;
        } else if (this.hasOAuthFlow(definition) && definition.flow === 'application') {
          oauth.flows.clientCredentials = { tokenUrl: definition.tokenUrl, scopes: definition.scopes || {} } as Swagger.OAuth2SecurityFlow3;
        } else if (this.hasOAuthFlow(definition) && definition.flow === 'implicit') {
          oauth.flows.implicit = { authorizationUrl: definition.authorizationUrl, scopes: definition.scopes || {} } as Swagger.OAuth2SecurityFlow3;
        }

        defs[key] = oauth;
      } else {
        defs[key] = definitions[key];
      }
    });
    return defs;
  }

  private hasOAuthFlow(definition: any): definition is { flow: string } {
    return !!definition.flow;
  }

  private hasOAuthFlows(definition: any): definition is { flows: Swagger.OAuthFlow } {
    return !!definition.flows;
  }

  private buildServers() {
    const basePath = normalisePath(this.config.basePath as string, '/', undefined, false);
    const scheme = this.config.schemes ? this.config.schemes[0] : 'https';
    const hosts = this.config.servers ? this.config.servers : this.config.host ? [this.config.host!] : undefined;
    const convertHost = (host: string) => ({ url: `${scheme}://${host}${basePath}` });
    return (hosts?.map(convertHost) || [{ url: basePath }]) as Swagger.Server[];
  }

  private buildSchema(): { [name: string]: Swagger.Schema31 } {
    const schemas: { [name: string]: Swagger.Schema31 } = {};

    Object.keys(this.metadata.referenceTypeMap).forEach(typeName => {
      const referenceType = this.metadata.referenceTypeMap[typeName];

      if (referenceType.dataType === 'refObject') {
        const required = referenceType.properties.filter(p => this.isRequiredWithoutDefault(p) && !this.hasUndefined(p)).map(p => p.name);

        const schema: Swagger.Schema31 = {
          type: 'object',
          description: referenceType.description,
          properties: this.buildProperties(referenceType.properties),
          required: required.length > 0 ? Array.from(new Set(required)) : undefined,
        };

        if (referenceType.additionalProperties) {
          schema.additionalProperties = this.buildAdditionalProperties(referenceType.additionalProperties) as Swagger.Schema31;
        } else {
          schema.additionalProperties = this.determineImplicitAdditionalPropertiesValue();
        }

        if (referenceType.example) {
          schema.example = referenceType.example;
        }

        if (referenceType.deprecated) {
          schema.deprecated = true;
        }

        schemas[referenceType.refName] = schema;
      } else if (referenceType.dataType === 'refEnum') {
        const enumTypes = this.determineTypesUsedInEnum(referenceType.enums);

        if (enumTypes.size === 1) {
          schemas[referenceType.refName] = {
            type: enumTypes.has('string') ? 'string' : 'number',
            enum: referenceType.enums,
            description: referenceType.description,
          };
        } else {
          schemas[referenceType.refName] = {
            anyOf: [
              {
                type: 'number',
                enum: referenceType.enums.filter(e => typeof e === 'number'),
              },
              {
                type: 'string',
                enum: referenceType.enums.filter(e => typeof e === 'string'),
              },
            ],
            description: referenceType.description,
          };
        }

        if (this.config.xEnumVarnames && referenceType.enumVarnames && referenceType.enums.length === referenceType.enumVarnames.length) {
          (schemas[referenceType.refName] as any)['x-enum-varnames'] = referenceType.enumVarnames;
        }

        if (referenceType.example) {
          schemas[referenceType.refName].example = referenceType.example;
        }

        if (referenceType.deprecated) {
          schemas[referenceType.refName].deprecated = true;
        }
      } else if (referenceType.dataType === 'refAlias') {
        const swaggerType = this.getSwaggerType(referenceType.type) as Swagger.Schema31;
        const format = referenceType.format as Swagger.DataFormat;
        const validators = Object.keys(referenceType.validators)
          .filter(shouldIncludeValidatorInSchema)
          .reduce((acc, key) => {
            return {
              ...acc,
              [key]: referenceType.validators[key]!.value,
            };
          }, {});

        schemas[referenceType.refName] = {
          ...swaggerType,
          default: referenceType.default ?? swaggerType.default,
          format: format ?? swaggerType.format,
          description: referenceType.description,
          example: referenceType.example,
          ...validators,
        };

        if (referenceType.deprecated) {
          schemas[referenceType.refName].deprecated = true;
        }
      } else {
        assertNever(referenceType);
      }
    });

    return schemas;
  }

  private buildPaths() {
    const paths: { [pathName: string]: Swagger.Path3 } = {};

    this.metadata.controllers.forEach(controller => {
      const normalisedControllerPath = normalisePath(controller.path, '/');
      // construct documentation using all methods except @Hidden
      controller.methods
        .filter(method => !method.isHidden)
        .forEach(method => {
          const normalisedMethodPath = normalisePath(method.path, '/');
          let path = normalisePath(`${normalisedControllerPath}${normalisedMethodPath}`, '/', '', false);
          path = convertColonPathParams(path);
          paths[path] = paths[path] || {};
          this.buildMethod(controller.name, method, paths[path], controller.produces);
        });
    });

    return paths;
  }

  private buildMethod(controllerName: string, method: Tsoa.Method, pathObject: any, defaultProduces?: string[]) {
    const pathMethod: Swagger.Operation31 = (pathObject[method.method] = this.buildOperation(controllerName, method, defaultProduces));
    pathMethod.description = method.description;
    pathMethod.summary = method.summary;
    pathMethod.tags = method.tags;

    // Use operationId tag otherwise fallback to generated. Warning: This doesn't check uniqueness.
    pathMethod.operationId = method.operationId || pathMethod.operationId;

    if (method.deprecated) {
      pathMethod.deprecated = method.deprecated;
    }

    if (method.security) {
      pathMethod.security = method.security;
    }

    const bodyParams: Tsoa.Parameter[] = method.parameters.filter(p => p.in === 'body');
    const bodyPropParams: Tsoa.Parameter[] = method.parameters.filter(p => p.in === 'body-prop');
    const formParams: Tsoa.Parameter[] = method.parameters.filter(p => p.in === 'formData');
    const queriesParams: Tsoa.Parameter[] = method.parameters.filter(p => p.in === 'queries');

    pathMethod.parameters = method.parameters
      .filter(p => {
        return ['body', 'formData', 'request', 'body-prop', 'res', 'queries', 'request-prop'].indexOf(p.in) === -1;
      })
      .map(p => this.buildParameter(p));

    if (queriesParams.length > 1) {
      throw new Error('Only one queries parameter allowed per controller method.');
    }

    if (queriesParams.length === 1) {
      pathMethod.parameters.push(...this.buildQueriesParameter(queriesParams[0]));
    }

    if (bodyParams.length > 1) {
      throw new Error('Only one body parameter allowed per controller method.');
    }

    if (bodyParams.length > 0 && formParams.length > 0) {
      throw new Error('Either body parameter or form parameters allowed per controller method - not both.');
    }

    if (bodyPropParams.length > 0) {
      if (!bodyParams.length) {
        bodyParams.push({
          in: 'body',
          name: 'body',
          parameterName: 'body',
          required: true,
          type: {
            dataType: 'nestedObjectLiteral',
            properties: [],
          } as Tsoa.NestedObjectLiteralType,
          validators: {},
          deprecated: false,
        });
      }

      const type: Tsoa.NestedObjectLiteralType = bodyParams[0].type as Tsoa.NestedObjectLiteralType;
      bodyPropParams.forEach((bodyParam: Tsoa.Parameter) => {
        type.properties.push(bodyParam as Tsoa.Property);
      });
    }

    if (bodyParams.length > 0) {
      pathMethod.requestBody = this.buildRequestBody(controllerName, method, bodyParams[0]);
    } else if (formParams.length > 0) {
      pathMethod.requestBody = this.buildRequestBodyWithFormData(controllerName, method, formParams);
    }

    method.extensions.forEach(ext => (pathMethod[ext.key] = ext.value));
  }

  protected buildOperation(controllerName: string, method: Tsoa.Method, defaultProduces?: string[]): Swagger.Operation31 {
    const swaggerResponses: { [name: string]: Swagger.Response31 } = {};

    method.responses.forEach((res: Tsoa.Response) => {
      swaggerResponses[res.name] = {
        description: res.description,
      };

      if (res.schema && !isVoidType(res.schema)) {
        swaggerResponses[res.name].content = {};
        const produces: string[] = res.produces || defaultProduces || [DEFAULT_RESPONSE_MEDIA_TYPE];
        for (const p of produces) {
          const { content } = swaggerResponses[res.name];
          swaggerResponses[res.name].content = {
            ...content,
            [p]: {
              schema: this.getSwaggerType(res.schema, this.config.useTitleTagsForInlineObjects ? this.getOperationId(controllerName, method) + 'Response' : undefined) as Swagger.Schema31,
            },
          };
        }

        if (res.examples) {
          let exampleCounter = 1;
          const examples = res.examples.reduce((acc, ex, currentIndex) => {
            const exampleLabel = res.exampleLabels?.[currentIndex];
            return { ...acc, [exampleLabel === undefined ? `Example ${exampleCounter++}` : exampleLabel]: { value: ex } };
          }, {});
          for (const p of produces) {
            /* eslint-disable @typescript-eslint/dot-notation */
            (swaggerResponses[res.name].content || {})[p]['examples'] = examples;
          }
        }
      }

      if (res.headers) {
        const headers: { [name: string]: Swagger.Header3 } = {};
        if (res.headers.dataType === 'refObject') {
          headers[res.headers.refName] = {
            schema: this.getSwaggerTypeForReferenceType(res.headers) as Swagger.Schema31,
            description: res.headers.description,
          };
        } else if (res.headers.dataType === 'nestedObjectLiteral') {
          res.headers.properties.forEach((each: Tsoa.Property) => {
            headers[each.name] = {
              schema: this.getSwaggerType(each.type) as Swagger.Schema31,
              description: each.description,
              required: this.isRequiredWithoutDefault(each),
            };
          });
        } else {
          assertNever(res.headers);
        }
        swaggerResponses[res.name].headers = headers;
      }
    });

    const operation: Swagger.Operation31 = {
      operationId: this.getOperationId(controllerName, method),
      responses: swaggerResponses,
    };

    return operation;
  }

  private buildRequestBodyWithFormData(controllerName: string, method: Tsoa.Method, parameters: Tsoa.Parameter[]): Swagger.RequestBody31 {
    const required: string[] = [];
    const properties: Record<string, Swagger.Schema31> = {};

    for (const parameter of parameters) {
      const mediaType = this.buildMediaType(controllerName, method, parameter);
      if (!mediaType.schema) continue;

      const schema = { ...mediaType.schema } as Swagger.Schema31;

      if (parameter.deprecated) {
        schema.deprecated = true;
      }

      properties[parameter.name] = schema;

      if (this.isRequiredWithoutDefault(parameter)) {
        required.push(parameter.name);
      }
    }

    return {
      required: required.length > 0,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties,
            ...(required.length > 0 ? { required } : {}),
          },
        },
      },
    };
  }

  private buildRequestBody(controllerName: string, method: Tsoa.Method, parameter: Tsoa.Parameter): Swagger.RequestBody31 {
    const mediaType = this.buildMediaType(controllerName, method, parameter);
    const consumes = method.consumes || DEFAULT_REQUEST_MEDIA_TYPE;

    return {
      description: parameter.description,
      required: this.isRequiredWithoutDefault(parameter),
      content: {
        [consumes]: mediaType,
      },
    };
  }

  private buildMediaType(controllerName: string, method: Tsoa.Method, parameter: Tsoa.Parameter): Swagger.MediaType31 {
    const validators = Object.keys(parameter.validators)
      .filter(shouldIncludeValidatorInSchema)
      .reduce((acc, key) => {
        return {
          ...acc,
          [key]: parameter.validators[key]!.value,
        };
      }, {});

    const mediaType: Swagger.MediaType31 = {
      schema: {
        ...(this.getSwaggerType(parameter.type, this.config.useTitleTagsForInlineObjects ? this.getOperationId(controllerName, method) + 'RequestBody' : undefined) as Swagger.Schema31),
        ...validators,
        ...(parameter.description && { description: parameter.description }),
      },
    };

    const parameterExamples = parameter.example;
    const parameterExampleLabels = parameter.exampleLabels;
    if (parameterExamples === undefined) {
      mediaType.example = parameterExamples;
    } else if (parameterExamples.length === 1) {
      mediaType.example = parameterExamples[0];
    } else {
      let exampleCounter = 1;
      mediaType.examples = parameterExamples.reduce((acc, ex, currentIndex) => {
        const exampleLabel = parameterExampleLabels?.[currentIndex];
        return { ...acc, [exampleLabel === undefined ? `Example ${exampleCounter++}` : exampleLabel]: { value: ex } };
      }, {});
    }

    return mediaType;
  }

  private buildQueriesParameter(source: Tsoa.Parameter): Swagger.Parameter31[] {
    if (source.type.dataType === 'refObject' || source.type.dataType === 'nestedObjectLiteral') {
      const properties = source.type.properties;

      return properties.map(property => this.buildParameter(this.queriesPropertyToQueryParameter(property)));
    }
    throw new Error(`Queries '${source.name}' parameter must be an object.`);
  }

  private buildParameter(source: Tsoa.Parameter): Swagger.Parameter31 {
    const schema: Swagger.Schema31 = {
      default: source.default,
    };

    const parameterType = this.getSwaggerType(source.type) as Swagger.Schema31;

    // Use format and type if present
    if (parameterType.format) {
      schema.format = this.throwIfNotDataFormat(parameterType.format);
    }
    if (parameterType.type) {
      const isValid = Array.isArray(parameterType.type) ? parameterType.type.every(el => this.isDataType(el)) : this.isDataType(parameterType.type);

      if (!isValid) {
        throw new Error(`Unhandled discriminated union member: ${JSON.stringify(parameterType.type)}`);
      }

      schema.type = parameterType.type;
    }

    // Handle ref case
    if (parameterType.$ref) {
      return {
        name: source.name,
        in: source.in as 'query' | 'header' | 'path' | 'cookie',
        required: this.isRequiredWithoutDefault(source),
        deprecated: source.deprecated || undefined,
        description: source.description,
        schema: parameterType,
        ...this.buildExamples(source),
      };
    }

    // Copy array-related and enum data
    if (parameterType.items !== undefined) {
      schema.items = parameterType.items;
    }
    if (parameterType.enum !== undefined) {
      schema.enum = parameterType.enum;
    }

    // Apply validators
    Object.entries(source.validators)
      .filter(([key]) => shouldIncludeValidatorInSchema(key))
      .forEach(([key, val]) => {
        (schema as any)[key] = val!.value;
      });

    // Assemble final parameter object
    const parameter: Swagger.Parameter31 = {
      name: source.name,
      in: source.in as 'query' | 'header' | 'path' | 'cookie',
      required: this.isRequiredWithoutDefault(source),
      deprecated: source.deprecated || undefined,
      description: source.description,
      schema,
      ...this.buildExamples(source),
    };

    return parameter;
  }

  protected buildProperties(source: Tsoa.Property[]): { [propertyName: string]: Swagger.Schema31 } {
    const properties: { [propertyName: string]: Swagger.Schema31 } = {};

    source.forEach(property => {
      let swaggerType = this.getSwaggerType(property.type) as Swagger.Schema31;
      const format = property.format as Swagger.DataFormat;

      swaggerType.description = property.description;
      swaggerType.example = property.example;
      swaggerType.format = format || swaggerType.format;

      if (!swaggerType.$ref) {
        swaggerType.default = property.default;

        Object.keys(property.validators)
          .filter(shouldIncludeValidatorInSchema)
          .forEach(key => {
            swaggerType = {
              ...swaggerType,
              [key]: property.validators[key]!.value,
            };
          });
      }

      if (property.deprecated) {
        swaggerType.deprecated = true;
      }

      if (property.extensions) {
        property.extensions.forEach(ext => {
          swaggerType[ext.key] = ext.value;
        });
      }

      properties[property.name] = swaggerType;
    });

    return properties;
  }

  protected getSwaggerTypeForReferenceType(referenceType: Tsoa.ReferenceType): Swagger.BaseSchema {
    return { $ref: `#/components/schemas/${encodeURIComponent(referenceType.refName)}` };
  }

  protected getSwaggerTypeForPrimitiveType(dataType: Tsoa.PrimitiveTypeLiteral): Swagger.BaseSchema {
    if (dataType === 'any') {
      // Setting additionalProperties causes issues with code generators for OpenAPI 3
      // Therefore, we avoid setting it explicitly (since it's the implicit default already)
      return {};
    } else if (dataType === 'file') {
      return { type: 'string', format: 'binary' };
    }

    return super.getSwaggerTypeForPrimitiveType(dataType);
  }

  private isNull(type: Tsoa.Type) {
    return type.dataType === 'enum' && type.enums.length === 1 && type.enums[0] === null;
  }

  // Join disparate enums with the same type into one.
  //
  // grouping enums is helpful because it makes the spec more readable and it
  // bypasses a failure in openapi-generator caused by using anyOf with
  // duplicate types.
  private groupEnums(types: Swagger.BaseSchema[]) {
    const returnTypes: Swagger.BaseSchema[] = [];
    const enumValuesByType: Record<string, Record<string, boolean | string | number | null>> = {};
    for (const type of types) {
      if (type.enum && type.type) {
        for (const enumValue of type.enum) {
          if (!enumValuesByType[type.type]) {
            enumValuesByType[type.type] = {};
          }
          enumValuesByType[type.type][String(enumValue)] = enumValue;
        }
      }
      // preserve non-enum types
      else {
        returnTypes.push(type);
      }
    }

    Object.keys(enumValuesByType).forEach(dataType =>
      returnTypes.push({
        type: dataType,
        enum: Object.values(enumValuesByType[dataType]),
      }),
    );

    return returnTypes;
  }

  protected removeDuplicateSwaggerTypes(types: Swagger.BaseSchema[]): Swagger.BaseSchema[] {
    if (types.length === 1) {
      return types;
    } else {
      const typesSet = new Set<string>();
      for (const type of types) {
        typesSet.add(JSON.stringify(type));
      }
      return Array.from(typesSet).map(typeString => JSON.parse(typeString));
    }
  }

  protected getSwaggerTypeForUnionType(type: Tsoa.UnionType, title?: string) {
    // Filter out nulls and undefineds
    const actualSwaggerTypes = this.removeDuplicateSwaggerTypes(
      this.groupEnums(
        type.types
          .filter(x => !this.isNull(x))
          .filter(x => x.dataType !== 'undefined')
          .map(x => this.getSwaggerType(x)),
      ),
    );
    const nullable = type.types.some(x => this.isNull(x));

    if (nullable) {
      if (actualSwaggerTypes.length === 1) {
        const [swaggerType] = actualSwaggerTypes;
        // for ref union with null, use an allOf with a single
        // element since you can't attach nullable directly to a ref.
        // https://swagger.io/docs/specification/using-ref/#syntax
        if (swaggerType.$ref) {
          return { allOf: [swaggerType], nullable };
        }

        // Note that null must be explicitly included in the list of enum values. Using nullable: true alone is not enough here.
        // https://swagger.io/docs/specification/data-models/enums/
        if (swaggerType.enum) {
          swaggerType.enum.push(null);
        }

        return { ...(title && { title }), ...swaggerType, nullable };
      } else {
        return { ...(title && { title }), anyOf: actualSwaggerTypes, nullable };
      }
    } else {
      if (actualSwaggerTypes.length === 1) {
        return { ...(title && { title }), ...actualSwaggerTypes[0] };
      } else {
        return { ...(title && { title }), anyOf: actualSwaggerTypes };
      }
    }
  }

  protected getSwaggerTypeForIntersectionType(type: Tsoa.IntersectionType, title?: string) {
    return { allOf: type.types.map(x => this.getSwaggerType(x)), ...(title && { title }) };
  }

  protected getSwaggerTypeForEnumType(enumType: Tsoa.EnumType, title?: string): Swagger.Schema3 {
    const types = this.determineTypesUsedInEnum(enumType.enums);

    if (types.size === 1) {
      const type = types.values().next().value;
      const nullable = enumType.enums.includes(null) ? true : false;
      return { ...(title && { title }), type, enum: enumType.enums.map(member => getValue(type, member)), nullable };
    } else {
      const valuesDelimited = Array.from(types).join(',');
      throw new Error(`Enums can only have string or number values, but enum had ${valuesDelimited}`);
    }
  }

  public throwIfNotDataType(strToTest: string): Swagger.DataType {
    const guiltyUntilInnocent = strToTest as Swagger.DataType;
    if (
      guiltyUntilInnocent === 'array' ||
      guiltyUntilInnocent === 'boolean' ||
      guiltyUntilInnocent === 'integer' ||
      guiltyUntilInnocent === 'file' ||
      guiltyUntilInnocent === 'number' ||
      guiltyUntilInnocent === 'object' ||
      guiltyUntilInnocent === 'string' ||
      guiltyUntilInnocent === 'undefined'
    ) {
      return guiltyUntilInnocent;
    } else {
      return assertNever(guiltyUntilInnocent);
    }
  }

  protected buildExamples(source: Pick<Tsoa.Parameter, 'example' | 'exampleLabels'>): {
    example?: unknown;
    examples?: { [name: string]: Swagger.Example3 };
  } {
    const { example: parameterExamples, exampleLabels } = source;

    if (parameterExamples === undefined) {
      return {};
    }

    if (parameterExamples.length === 1) {
      return {
        example: parameterExamples[0],
      };
    }

    let exampleCounter = 1;
    const examples = parameterExamples.reduce(
      (acc, ex, idx) => {
        const label = exampleLabels?.[idx];
        const name = label ?? `Example ${exampleCounter++}`;
        acc[name] = { value: ex };
        return acc;
      },
      {} as Record<string, Swagger.Example3>,
    );

    return { examples };
  }

  private isDataType(input: unknown): input is Swagger.DataType {
    if (typeof input !== 'string') {
      return false;
    }

    return input === 'array' || input === 'boolean' || input === 'integer' || input === 'file' || input === 'number' || input === 'object' || input === 'string' || input === 'undefined';
  }
}
