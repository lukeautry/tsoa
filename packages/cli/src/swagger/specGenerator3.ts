import { ExtendedSpecConfig } from '../cli';
import { Tsoa, assertNever, Swagger } from '@tsoa/runtime';
import { isVoidType } from '../utils/isVoidType';
import { convertColonPathParams, normalisePath } from './../utils/pathUtils';
import { DEFAULT_REQUEST_MEDIA_TYPE, DEFAULT_RESPONSE_MEDIA_TYPE, getValue } from './../utils/swaggerUtils';
import { SpecGenerator } from './specGenerator';
import { UnspecifiedObject } from '../utils/unspecifiedObject';
import { shouldIncludeValidatorInSchema } from '../utils/validatorUtils';

/**
 * TODO:
 * Handle formData parameters
 * Handle requestBodies of type other than json
 * Handle requestBodies as reusable objects
 * Handle headers, examples, responses, etc.
 * Cleaner interface between SpecGenerator2 and SpecGenerator3
 * Also accept OpenAPI 3.0.0 metadata, like components/securitySchemes instead of securityDefinitions
 */
export class SpecGenerator3 extends SpecGenerator {
  constructor(protected readonly metadata: Tsoa.Metadata, protected readonly config: ExtendedSpecConfig) {
    super(metadata, config);
  }

  public GetSpec() {
    let spec: Swagger.Spec3 = {
      openapi: '3.0.0',
      components: this.buildComponents(),
      info: this.buildInfo(),
      paths: this.buildPaths(),
      servers: this.buildServers(),
      tags: this.config.tags,
    };

    if (this.config.spec) {
      this.config.specMerging = this.config.specMerging || 'immediate';
      const mergeFuncs: { [key: string]: any } = {
        immediate: Object.assign,
        recursive: require('merge-anything').merge,
        deepmerge: (spec: UnspecifiedObject, merge: UnspecifiedObject): UnspecifiedObject => require('deepmerge').all([spec, merge]),
      };

      spec = mergeFuncs[this.config.specMerging](spec, this.config.spec);
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
    const url = this.config.host ? `${scheme}://${this.config.host}${basePath}` : basePath;
    return [
      {
        url,
      } as Swagger.Server,
    ];
  }

  private buildSchema() {
    const schema: { [name: string]: Swagger.Schema3 } = {};
    Object.keys(this.metadata.referenceTypeMap).map(typeName => {
      const referenceType = this.metadata.referenceTypeMap[typeName];

      if (referenceType.dataType === 'refObject') {
        const required = referenceType.properties.filter(p => p.required && !this.hasUndefined(p)).map(p => p.name);
        schema[referenceType.refName] = {
          description: referenceType.description,
          properties: this.buildProperties(referenceType.properties),
          required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
          type: 'object',
        };

        if (referenceType.additionalProperties) {
          schema[referenceType.refName].additionalProperties = this.buildAdditionalProperties(referenceType.additionalProperties);
        } else {
          // Since additionalProperties was not explicitly set in the TypeScript interface for this model
          //      ...we need to make a decision
          schema[referenceType.refName].additionalProperties = this.determineImplicitAdditionalPropertiesValue();
        }

        if (referenceType.example) {
          schema[referenceType.refName].example = referenceType.example;
        }
      } else if (referenceType.dataType === 'refEnum') {
        const enumTypes = this.determineTypesUsedInEnum(referenceType.enums);

        if (enumTypes.size === 1) {
          schema[referenceType.refName] = {
            description: referenceType.description,
            enum: referenceType.enums,
            type: enumTypes.has('string') ? 'string' : 'number',
          };
          if (this.config.xEnumVarnames && referenceType.enumVarnames !== undefined && referenceType.enums.length === referenceType.enumVarnames.length) {
            schema[referenceType.refName]['x-enum-varnames'] = referenceType.enumVarnames;
          }
        } else {
          schema[referenceType.refName] = {
            description: referenceType.description,
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
          };
        }
      } else if (referenceType.dataType === 'refAlias') {
        const swaggerType = this.getSwaggerType(referenceType.type);
        const format = referenceType.format as Swagger.DataFormat;
        const validators = Object.keys(referenceType.validators)
          .filter(shouldIncludeValidatorInSchema)
          .reduce((acc, key) => {
            return {
              ...acc,
              [key]: referenceType.validators[key]!.value,
            };
          }, {});

        schema[referenceType.refName] = {
          ...(swaggerType as Swagger.Schema3),
          default: referenceType.default || swaggerType.default,
          example: referenceType.example,
          format: format || swaggerType.format,
          description: referenceType.description,
          ...validators,
        };
      } else {
        assertNever(referenceType);
      }
      if (referenceType.deprecated) {
        schema[referenceType.refName].deprecated = true;
      }
    });

    return schema;
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
    const pathMethod: Swagger.Operation3 = (pathObject[method.method] = this.buildOperation(controllerName, method, defaultProduces));
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
        return ['body', 'formData', 'request', 'body-prop', 'res', 'queries'].indexOf(p.in) === -1;
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

  protected buildOperation(controllerName: string, method: Tsoa.Method, defaultProduces?: string[]): Swagger.Operation3 {
    const swaggerResponses: { [name: string]: Swagger.Response3 } = {};

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
              schema: this.getSwaggerType(res.schema, this.config.useTitleTagsForInlineObjects ? this.getOperationId(controllerName, method) + 'Response' : undefined) as Swagger.Schema3,
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
            schema: this.getSwaggerTypeForReferenceType(res.headers) as Swagger.Schema3,
            description: res.headers.description,
          };
        } else if (res.headers.dataType === 'nestedObjectLiteral') {
          res.headers.properties.forEach((each: Tsoa.Property) => {
            headers[each.name] = {
              schema: this.getSwaggerType(each.type) as Swagger.Schema3,
              description: each.description,
              required: each.required,
            };
          });
        } else {
          assertNever(res.headers);
        }
        swaggerResponses[res.name].headers = headers;
      }
    });

    const operation: Swagger.Operation3 = {
      operationId: this.getOperationId(controllerName, method),
      responses: swaggerResponses,
    };

    return operation;
  }

  private buildRequestBodyWithFormData(controllerName: string, method: Tsoa.Method, parameters: Tsoa.Parameter[]): Swagger.RequestBody {
    const required: string[] = [];
    const properties: { [propertyName: string]: Swagger.Schema3 } = {};
    for (const parameter of parameters) {
      const mediaType = this.buildMediaType(controllerName, method, parameter);
      properties[parameter.name] = mediaType.schema!;
      if (parameter.required) {
        required.push(parameter.name);
      }
      if (parameter.deprecated) {
        properties[parameter.name].deprecated = parameter.deprecated;
      }
    }
    const requestBody: Swagger.RequestBody = {
      required: required.length > 0,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties,
            // An empty list required: [] is not valid.
            // If all properties are optional, do not specify the required keyword.
            ...(required && required.length && { required }),
          },
        },
      },
    };
    return requestBody;
  }

  private buildRequestBody(controllerName: string, method: Tsoa.Method, parameter: Tsoa.Parameter): Swagger.RequestBody {
    const mediaType = this.buildMediaType(controllerName, method, parameter);
    const consumes = method.consumes || DEFAULT_REQUEST_MEDIA_TYPE;

    const requestBody: Swagger.RequestBody = {
      description: parameter.description,
      required: parameter.required,
      content: {
        [consumes]: mediaType,
      },
    };

    return requestBody;
  }

  private buildMediaType(controllerName: string, method: Tsoa.Method, parameter: Tsoa.Parameter): Swagger.MediaType {
    const validators = Object.keys(parameter.validators)
      .filter(shouldIncludeValidatorInSchema)
      .reduce((acc, key) => {
        return {
          ...acc,
          [key]: parameter.validators[key]!.value,
        };
      }, {});

    const mediaType: Swagger.MediaType = {
      schema: {
        ...(this.getSwaggerType(parameter.type, this.config.useTitleTagsForInlineObjects ? this.getOperationId(controllerName, method) + 'RequestBody' : undefined) as Swagger.Schema3),
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

  private buildQueriesParameter(source: Tsoa.Parameter): Swagger.Parameter3[] {
    if (source.type.dataType === 'refObject' || source.type.dataType === 'nestedObjectLiteral') {
      const properties = source.type.properties;

      return properties.map(property => this.buildParameter(this.queriesPropertyToQueryParameter(property)));
    }
    throw new Error(`Queries '${source.name}' parameter must be an object.`);
  }

  private buildParameter(source: Tsoa.Parameter): Swagger.Parameter3 {
    const parameter = {
      description: source.description,
      in: source.in,
      name: source.name,
      required: source.required,
      schema: {
        default: source.default,
        format: undefined,
      },
    } as Swagger.Parameter3;
    if (source.deprecated) {
      parameter.deprecated = true;
    }

    const parameterType = this.getSwaggerType(source.type);
    if (parameterType.format) {
      parameter.schema.format = this.throwIfNotDataFormat(parameterType.format);
    }

    if (parameterType.$ref) {
      parameter.schema = parameterType as Swagger.Schema;
      return parameter;
    }

    const validatorObjs: { [key in Tsoa.SchemaValidatorKey]?: unknown } = {};
    Object.keys(source.validators)
      .filter(shouldIncludeValidatorInSchema)
      .forEach(key => {
        validatorObjs[key] = source.validators[key]!.value;
      });

    if (source.type.dataType === 'any') {
      parameter.schema.type = 'string';
    } else {
      if (parameterType.type) {
        parameter.schema.type = this.throwIfNotDataType(parameterType.type);
      }
      parameter.schema.items = parameterType.items;
      parameter.schema.enum = parameterType.enum;
    }

    parameter.schema = Object.assign({}, parameter.schema, validatorObjs);

    const parameterExamples = source.example;
    const parameterExampleLabels = source.exampleLabels;
    if (parameterExamples === undefined) {
      parameter.example = parameterExamples;
    } else if (parameterExamples.length === 1) {
      parameter.example = parameterExamples[0];
    } else {
      let exampleCounter = 1;
      parameter.examples = parameterExamples.reduce((acc, ex, currentIndex) => {
        const exampleLabel = parameterExampleLabels?.[currentIndex];
        return { ...acc, [exampleLabel === undefined ? `Example ${exampleCounter++}` : exampleLabel]: { value: ex } };
      }, {});
    }

    return parameter;
  }

  protected buildProperties(source: Tsoa.Property[]) {
    const properties: { [propertyName: string]: Swagger.Schema3 } = {};

    source.forEach(property => {
      let swaggerType = this.getSwaggerType(property.type) as Swagger.Schema3;
      const format = property.format as Swagger.DataFormat;
      swaggerType.description = property.description;
      swaggerType.example = property.example;
      swaggerType.format = format || swaggerType.format;
      if (!swaggerType.$ref) {
        swaggerType.default = property.default;

        Object.keys(property.validators)
          .filter(shouldIncludeValidatorInSchema)
          .forEach(key => {
            swaggerType = { ...swaggerType, [key]: property.validators[key]!.value };
          });
      }
      if (property.deprecated) {
        swaggerType.deprecated = true;
      }

      if (property.extensions) {
        property.extensions.forEach(property => {
          swaggerType[property.key] = property.value;
        });
      }

      properties[property.name] = swaggerType;
    });

    return properties;
  }

  protected getSwaggerTypeForReferenceType(referenceType: Tsoa.ReferenceType): Swagger.BaseSchema {
    return { $ref: `#/components/schemas/${referenceType.refName}` };
  }

  protected getSwaggerTypeForPrimitiveType(dataType: Tsoa.PrimitiveTypeLiteral): Swagger.Schema {
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
  private groupEnums(types: Array<Swagger.Schema | Swagger.BaseSchema>) {
    const returnTypes: Array<Swagger.Schema | Swagger.BaseSchema> = [];
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

  protected removeDuplicateSwaggerTypes(types: Array<Swagger.Schema | Swagger.BaseSchema>): Array<Swagger.Schema | Swagger.BaseSchema> {
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
}
