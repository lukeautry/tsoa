import { ExtendedSpecConfig } from '../cli';
import { Tsoa } from '../metadataGeneration/tsoa';
import { assertNever } from '../utils/assertNever';
import { isVoidType } from '../utils/isVoidType';
import { convertColonPathParams, normalisePath } from './../utils/pathUtils';
import { SpecGenerator } from './specGenerator';
import { Swagger } from './swagger';
import { UnspecifiedObject } from '../utils/unspecifiedObject';

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
      components: this.buildComponents(),
      info: this.buildInfo(),
      openapi: '3.0.0',
      paths: this.buildPaths(),
      servers: this.buildServers(),
      tags: this.config.tags,
    };

    if (this.config.spec) {
      this.config.specMerging = this.config.specMerging || 'immediate';
      const mergeFuncs: { [key: string]: any } = {
        immediate: Object.assign,
        recursive: require('merge').recursive,
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

  private translateSecurityDefinitions(definitions: { [name: string]: Swagger.Security }) {
    const defs: { [name: string]: Swagger.Security } = {};
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
        const required = referenceType.properties.filter(p => p.required).map(p => p.name);
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
          .filter(key => {
            return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
          })
          .reduce((acc, key) => {
            return {
              ...acc,
              [key]: referenceType.validators[key].value,
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
          this.buildMethod(controller.name, method, paths[path]);
        });
    });

    return paths;
  }

  private buildMethod(controllerName: string, method: Tsoa.Method, pathObject: any) {
    const pathMethod: Swagger.Operation3 = (pathObject[method.method] = this.buildOperation(controllerName, method));
    pathMethod.description = method.description;
    pathMethod.summary = method.summary;
    pathMethod.tags = method.tags;

    // Use operationId tag otherwise fallback to generated. Warning: This doesn't check uniqueness.
    pathMethod.operationId = method.operationId || pathMethod.operationId;

    if (method.deprecated) {
      pathMethod.deprecated = method.deprecated;
    }

    if (method.security) {
      pathMethod.security = method.security as any[];
    }

    const bodyParams = method.parameters.filter(p => p.in === 'body');

    pathMethod.parameters = method.parameters
      .filter(p => {
        return ['body', 'formData', 'request', 'body-prop', 'res'].indexOf(p.in) === -1;
      })
      .map(p => this.buildParameter(p));

    if (bodyParams.length > 1) {
      throw new Error('Only one body parameter allowed per controller method.');
    }

    if (bodyParams.length > 0) {
      pathMethod.requestBody = this.buildRequestBody(controllerName, method, bodyParams[0]);
    }

    method.extensions.forEach(ext => (pathMethod[ext.key] = ext.value));
  }

  protected buildOperation(controllerName: string, method: Tsoa.Method): Swagger.Operation3 {
    const swaggerResponses: { [name: string]: Swagger.Response3 } = {};

    method.responses.forEach((res: Tsoa.Response) => {
      swaggerResponses[res.name] = {
        description: res.description,
      };
      if (res.schema && !isVoidType(res.schema)) {
        swaggerResponses[res.name].content = {
          'application/json': {
            schema: this.getSwaggerType(res.schema),
          } as Swagger.Schema3,
        };
      }
      if (res.examples) {
        const examples = res.examples.reduce<Swagger.Example['examples']>((acc, ex, currentIndex) => {
          return { ...acc, [`Example ${currentIndex + 1}`]: { value: ex } };
        }, {});
        /* tslint:disable:no-string-literal */
        (swaggerResponses[res.name].content || {})['application/json']['examples'] = examples;
      }
    });

    return {
      operationId: this.getOperationId(method.name),
      responses: swaggerResponses,
    };
  }

  private buildRequestBody(controllerName: string, method: Tsoa.Method, parameter: Tsoa.Parameter): Swagger.RequestBody {
    const validators = Object.keys(parameter.validators)
      .filter(key => {
        return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
      })
      .reduce((acc, key) => {
        return {
          ...acc,
          [key]: validators[key].value,
        };
      }, {});

    const mediaType: Swagger.MediaType = {
      schema: {
        ...this.getSwaggerType(parameter.type),
        ...validators,
      },
    };

    const parameterExamples = parameter.example;
    if (parameterExamples === undefined) {
      mediaType.example = parameterExamples;
    } else if (parameterExamples.length === 1) {
      mediaType.example = parameterExamples[0];
    } else {
      mediaType.examples = {};
      parameterExamples.forEach((example, index) =>
        Object.assign(mediaType.examples, {
          [`Example ${index + 1}`]: { value: example } as Swagger.Example3,
        }),
      );
    }

    const requestBody: Swagger.RequestBody = {
      description: parameter.description,
      required: parameter.required,
      content: {
        'application/json': mediaType,
      },
    };

    return requestBody;
  }

  private buildParameter(source: Tsoa.Parameter): Swagger.Parameter {
    const parameter = {
      description: source.description,
      in: source.in,
      name: source.name,
      required: source.required,
      schema: {
        default: source.default,
        format: undefined,
      },
    } as Swagger.Parameter;

    const parameterType = this.getSwaggerType(source.type);
    if (parameterType.format) {
      parameter.schema.format = this.throwIfNotDataFormat(parameterType.format);
    }

    if (parameterType.$ref) {
      parameter.schema = parameterType as Swagger.Schema;
      return parameter;
    }

    const validatorObjs = {};
    Object.keys(source.validators)
      .filter(key => {
        return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
      })
      .forEach((key: string) => {
        validatorObjs[key] = source.validators[key].value;
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
    if (parameterExamples === undefined) {
      parameter.example = parameterExamples;
    } else if (parameterExamples.length === 1) {
      parameter.example = parameterExamples[0];
    } else {
      parameter.examples = {};
      parameterExamples.forEach((example, index) =>
        Object.assign(parameter.examples, {
          [`Example ${index + 1}`]: { value: example } as Swagger.Example3,
        }),
      );
    }

    return parameter;
  }

  protected buildProperties(source: Tsoa.Property[]) {
    const properties: { [propertyName: string]: Swagger.Schema3 } = {};

    source.forEach(property => {
      const swaggerType = this.getSwaggerType(property.type) as Swagger.Schema3;
      const format = property.format as Swagger.DataFormat;
      swaggerType.description = property.description;
      swaggerType.example = property.example;
      swaggerType.format = format || swaggerType.format;
      if (!swaggerType.$ref) {
        swaggerType.default = property.default;

        Object.keys(property.validators)
          .filter(key => {
            return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
          })
          .forEach(key => {
            swaggerType[key] = property.validators[key].value;
          });
      }

      properties[property.name] = swaggerType as Swagger.Schema;
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
    }

    return super.getSwaggerTypeForPrimitiveType(dataType);
  }

  protected getSwaggerTypeForUnionType(type: Tsoa.UnionType) {
    // use nullable: true to represent simple unions with null. This converts to
    // a better type when using code generation in a client.
    if (type.types.length === 2 && type.types.find(typeInUnion => typeInUnion.dataType === 'enum' && typeInUnion.enums.includes(null))) {
      const nullEnumIndex = type.types.findIndex(type => type.dataType === 'enum' && type.enums.includes(null));
      const typeIndex = nullEnumIndex === 1 ? 0 : 1;
      const swaggerType = this.getSwaggerType(type.types[typeIndex]);

      const isRef = !!swaggerType.$ref;

      // let special case of ref union with null fall through to be handled as a
      // anyOf. Example of this case is:
      // type Nullable<T> = T | null;
      // type MyNullableType = Nullable<OtherType>;
      //
      // this is required because other members of $ref containing objects are
      // ignored so the null would otherwise get left out:
      // https://swagger.io/docs/specification/using-ref/#syntax
      if (!isRef) {
        swaggerType['nullable'] = true;
        return swaggerType;
      }
    }

    return { anyOf: type.types.map(x => this.getSwaggerType(x)) };
  }

  protected getSwaggerTypeForIntersectionType(type: Tsoa.IntersectionType) {
    return { allOf: type.types.map(x => this.getSwaggerType(x)) };
  }

  protected getSwaggerTypeForEnumType(enumType: Tsoa.EnumType): Swagger.Schema3 {
    const types = this.determineTypesUsedInEnum(enumType.enums);

    if (types.size === 1) {
      const type = types.values().next().value;
      const nullable = enumType.enums.includes(null) ? true : false;
      return { type, enum: enumType.enums.map(member => (member === null ? null : String(member))), nullable };
    } else {
      const valuesDelimited = Array.from(types).join(',');
      throw new Error(`Enums can only have string or number values, but enum had ${valuesDelimited}`);
    }
  }
}
