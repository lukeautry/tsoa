import { Tsoa } from '../metadataGeneration/tsoa';
import { assertNever } from '../utils/assertNever';
import { SwaggerConfig } from './../config';
import { normalisePath } from './../utils/pathUtils';
import { SpecGenerator } from './specGenerator';
import { Swagger } from './swagger';

/**
 * TODO:
 * Handle formData parameters
 * Handle tags
 * Handle requestBodies of type other than json
 * Handle requestBodies as reusable objects
 * Handle headers, examples, responses, etc.
 * Cleaner interface between SpecGenerator2 and SpecGenerator3
 * Also accept OpenAPI 3.0.0 metadata, like components/securitySchemes instead of securityDefinitions
 */
export class SpecGenerator3 extends SpecGenerator {
  constructor(protected readonly metadata: Tsoa.Metadata, protected readonly config: SwaggerConfig) {
    super(metadata, config);
  }

  public GetSpec() {
    let spec: Swagger.Spec3 = {
      components: this.buildComponents(),
      info: this.buildInfo(),
      openapi: '3.0.0',
      paths: this.buildPaths(),
      servers: this.buildServers(),
    };

    if (this.config.spec) {
      this.config.specMerging = this.config.specMerging || 'immediate';
      const mergeFuncs: { [key: string]: any } = {
        immediate: Object.assign,
        recursive: require('merge').recursive,
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
        const definition = definitions[key] as Swagger.OAuth2PasswordSecurity &
          Swagger.OAuth2ApplicationSecurity &
          Swagger.OAuth2ImplicitSecurity &
          Swagger.OAuth2AccessCodeSecurity &
          Swagger.OAuth2Security3;
        const oauth = (defs[key] || {
          type: 'oauth2',
          description: definitions[key].description,
          flows: definition.flows || {},
        }) as Swagger.OAuth2Security3;

        if (definition.flow === 'password') {
          oauth.flows.password = { tokenUrl: definition.tokenUrl, scopes: definition.scopes || {} } as Swagger.OAuth2SecurityFlow3;
        } else if (definition.flow === 'accessCode') {
          oauth.flows.authorizationCode = { tokenUrl: definition.tokenUrl, authorizationUrl: definition.authorizationUrl, scopes: definition.scopes || {} } as Swagger.OAuth2SecurityFlow3;
        } else if (definition.flow === 'application') {
          oauth.flows.clientCredentials = { tokenUrl: definition.tokenUrl, scopes: definition.scopes || {} } as Swagger.OAuth2SecurityFlow3;
        } else if (definition.flow === 'implicit') {
          oauth.flows.implicit = { authorizationUrl: definition.authorizationUrl, scopes: definition.scopes || {} } as Swagger.OAuth2SecurityFlow3;
        }

        defs[key] = oauth;
      } else {
        defs[key] = definitions[key];
      }
    });
    return defs;
  }

  private buildServers() {
    const basePath = normalisePath(this.config.basePath as string, '/', undefined, false);
    const scheme = this.config.schemes ? this.config.schemes[0] : 'https';
    const host = this.config.host || 'localhost:3000';
    return [
      {
        url: `${scheme}://${host}${basePath}`,
      } as Swagger.Server,
    ];
  }

  private buildSchema() {
    const schema: { [name: string]: Swagger.Schema } = {};
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
        schema[referenceType.refName] = {
          description: referenceType.description,
          enum: referenceType.enums,
          type: this.decideEnumType(referenceType.enums, referenceType.refName),
        };
      } else if (referenceType.dataType === 'refAlias') {
        const swaggerType = this.getSwaggerType(referenceType.type);

        schema[referenceType.refName] = {
          ...(swaggerType as Swagger.Schema),
          description: referenceType.description,
          example: referenceType.example,
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
          const path = normalisePath(`${normalisedControllerPath}${normalisedMethodPath}`, '/', '', false);
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
        return ['body', 'formData', 'request', 'body-prop'].indexOf(p.in) === -1;
      })
      .map(p => this.buildParameter(p));

    if (bodyParams.length > 1) {
      throw new Error('Only one body parameter allowed per controller method.');
    }

    if (bodyParams.length > 0) {
      pathMethod.requestBody = this.buildRequestBody(controllerName, method, bodyParams[0]);
    }
  }

  protected buildOperation(controllerName: string, method: Tsoa.Method): Swagger.Operation3 {
    const swaggerResponses: { [name: string]: Swagger.Response3 } = {};

    method.responses.forEach((res: Tsoa.Response) => {
      swaggerResponses[res.name] = {
        content: {
          'application/json': {} as Swagger.Schema3,
        },
        description: res.description,
      };
      if (res.schema && res.schema.dataType !== 'void') {
        /* tslint:disable:no-string-literal */
        (swaggerResponses[res.name].content || {})['application/json']['schema'] = this.getSwaggerType(res.schema);
      }
      if (res.examples) {
        /* tslint:disable:no-string-literal */
        (swaggerResponses[res.name].content || {})['application/json']['examples'] = { example: { value: res.examples } };
      }
    });

    return {
      operationId: this.getOperationId(method.name),
      responses: swaggerResponses,
    };
  }

  private buildRequestBody(controllerName: string, method: Tsoa.Method, parameter: Tsoa.Parameter): Swagger.RequestBody {
    const parameterType = this.getSwaggerType(parameter.type);

    let schema: Swagger.Schema = { type: 'object' };
    if (parameterType.$ref) {
      schema = parameterType as Swagger.Schema;
    }

    if (parameter.type.dataType === 'array') {
      schema = {
        items: parameterType.items,
        type: 'array',
      };
    }

    return {
      content: {
        'application/json': { schema } as Swagger.MediaType,
      },
    } as Swagger.RequestBody;
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

    if (parameter.in === 'query' && parameterType.type === 'array') {
      (parameter as Swagger.QueryParameter).collectionFormat = 'multi';
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

    return parameter;
  }

  private buildProperties(source: Tsoa.Property[]) {
    const properties: { [propertyName: string]: Swagger.Schema3 } = {};

    source.forEach(property => {
      const swaggerType = this.getSwaggerType(property.type) as Swagger.Schema3;
      const format = property.format as Swagger.DataFormat;
      swaggerType.description = property.description;
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

      if (!property.required) {
        swaggerType.nullable = true;
      }

      properties[property.name] = swaggerType as Swagger.Schema;
    });

    return properties;
  }

  protected getSwaggerTypeForReferenceType(referenceType: Tsoa.ReferenceType): Swagger.BaseSchema {
    return { $ref: `#/components/schemas/${referenceType.refName}` };
  }

  protected getSwaggerTypeForUnionType(type: Tsoa.UnionType) {
    return { oneOf: type.types.map(x => this.getSwaggerType(x)) };
  }

  protected getSwaggerTypeForIntersectionType(type: Tsoa.IntersectionType) {
    return { allOf: type.types.map(x => this.getSwaggerType(x)) };
  }
}
