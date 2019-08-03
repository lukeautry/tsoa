import { Tsoa } from '../metadataGeneration/tsoa';
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
    if (this.config.version) { info.version = this.config.version; }
    if (this.config.description) { info.description = this.config.description; }
    if (this.config.license) { info.license = { name: this.config.license }; }
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
    return [{
      url: `${scheme}://${host}${basePath}`,
    } as Swagger.Server];
  }

  private buildSchema() {
    const schema: { [name: string]: Swagger.Schema } = {};
    const config = this.config;
    Object.keys(this.metadata.referenceTypeMap).map(typeName => {
      const referenceType = this.metadata.referenceTypeMap[typeName];

      // Object definition
      if (referenceType.properties) {
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
            if (config.noImplicitAdditionalProperties) {
                schema[referenceType.refName].additionalProperties = false;
            } else {
                // we'll explicitly set the default, which for swagger
                schema[referenceType.refName].additionalProperties = true;
            }
        }

        if (referenceType.example) {
          schema[referenceType.refName].example = referenceType.example;
        }
      }

      // Enum definition
      if (referenceType.enums) {
        schema[referenceType.refName] = {
          description: referenceType.description,
          enum: referenceType.enums,
          type: 'string',
        };
      }
    });

    return schema;
  }

  private buildPaths() {
    const paths: { [pathName: string]: Swagger.Path3 } = {};

    this.metadata.controllers.forEach(controller => {
      const normalisedControllerPath = normalisePath(controller.path, '/');
      // construct documentation using all methods except @Hidden
      controller.methods.filter(method => !method.isHidden).forEach(method => {
        const normalisedMethodPath = normalisePath(method.path, '/');
        const path = normalisePath(`${normalisedControllerPath}${normalisedMethodPath}`, '/', '', false);
        paths[path] = paths[path] || {};
        this.buildMethod(controller.name, method, paths[path]);
      });
    });

    return paths;
  }

  private buildMethod(controllerName: string, method: Tsoa.Method, pathObject: any) {
    const pathMethod: Swagger.Operation3 = pathObject[method.method] = this.buildOperation(controllerName, method);
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
        'application/json': {schema} as Swagger.MediaType,
      },
    } as Swagger.RequestBody;
  }

  private buildParameter(source: Tsoa.Parameter): Swagger.Parameter {
    let parameter = {
      default: source.default,
      description: source.description,
      in: source.in,
      name: source.name,
      required: source.required,
    } as Swagger.Parameter;

    const parameterType = this.getSwaggerType(source.type);
    if (parameterType.format) {
        parameter.format = this.throwIfNotDataFormat(parameterType.format);
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
      parameter.type = 'string';
    } else {
      if (parameterType.type) {
        parameter.type = this.throwIfNotDataType(parameterType.type);
      }
      parameter.items = parameterType.items;
      parameter.enum = parameterType.enum;
    }

    if (parameter.schema) {
      parameter.schema = Object.assign({}, parameter.schema, validatorObjs);
    } else {
      parameter = Object.assign({}, parameter, validatorObjs);
    }

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
}
