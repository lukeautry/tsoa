import { SwaggerConfig } from './../config';
import { Tsoa } from '../metadataGeneration/tsoa';
import { Swagger } from './swagger';

export class SpecGenerator {
  constructor(private readonly metadata: Tsoa.Metadata, private readonly config: SwaggerConfig) { }

  public GetSpec() {
    let spec: Swagger.Spec = {
      basePath: this.config.basePath,
      consumes: ['application/json'],
      definitions: this.buildDefinitions(),
      info: {
        title: '',
      },
      paths: this.buildPaths(),
      produces: ['application/json'],
      swagger: '2.0',
    };

    spec.securityDefinitions = this.config.securityDefinitions
      ? this.config.securityDefinitions
      : {};

    if (this.config.description) { spec.info.description = this.config.description; }
    if (this.config.license) { spec.info.license = { name: this.config.license }; }
    if (this.config.name) { spec.info.title = this.config.name; }
    if (this.config.version) { spec.info.version = this.config.version; }
    if (this.config.host) { spec.host = this.config.host; }

    if (this.config.spec) {
      this.config.specMerging = this.config.specMerging || 'immediate';
      const mergeFuncs: { [key: string]: Function } = {
        immediate: Object.assign,
        recursive: require('merge').recursive,
      };

      spec = mergeFuncs[this.config.specMerging](spec, this.config.spec);
    }

    return spec;
  }

  private buildDefinitions() {
    const definitions: { [definitionsName: string]: Swagger.Schema } = {};
    Object.keys(this.metadata.ReferenceTypes).map(typeName => {
      const referenceType = this.metadata.ReferenceTypes[typeName];
      const required = referenceType.properties.filter(p => p.required).map(p => p.name);

      definitions[referenceType.typeName] = {
        description: referenceType.description,
        properties: this.buildProperties(referenceType.properties),
        required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
        type: 'object',
      };

      if (referenceType.additionalProperties) {
        definitions[referenceType.typeName].additionalProperties = this.buildAdditionalProperties(referenceType.additionalProperties);
      }
    });

    return definitions;
  }

  private buildPaths() {
    const paths: { [pathName: string]: Swagger.Path } = {};

    this.metadata.Controllers.forEach(controller => {
      controller.methods.forEach(method => {
        const path = `${controller.path ? `/${controller.path}` : ''}${method.path}`;
        paths[path] = paths[path] || {};
        this.buildPathMethod(controller.name, method, paths[path]);
      });
    });

    return paths;
  }

  private buildPathMethod(controllerName: string, method: Tsoa.Method, pathObject: any) {
    const pathMethod: Swagger.Operation = pathObject[method.method] = this.buildOperation(controllerName, method);
    pathMethod.description = method.description;
    pathMethod.summary = method.summary;

    if (method.deprecated) {
      pathMethod.deprecated = method.deprecated;
    }
    if (method.tags.length) {
      pathMethod.tags = method.tags;
    }
    if (method.security) {
      const security: any = {};
      security[method.security.name] = method.security.scopes ? method.security.scopes : [];
      pathMethod.security = [security];
    }

    pathMethod.parameters = method.parameters
      .filter(p => {
        return !(p.in === 'request' || p.in === 'body-prop');
      })
      .map(p => this.buildParameter(p));

    const bodyPropParameter = this.buildBodyPropParameter(controllerName, method);
    if (bodyPropParameter) {
      pathMethod.parameters.push(bodyPropParameter);
    }
    if (pathMethod.parameters.filter((p: Swagger.BaseParameter) => p.in === 'body').length > 1) {
      throw new Error('Only one body parameter allowed per controller method.');
    }
  }

  private buildBodyPropParameter(controllerName: string, method: Tsoa.Method) {
    const properties: any = {};
    const required: string[] = [];

    method.parameters
      .filter(p => p.in === 'body-prop')
      .forEach(p => {
        properties[p.name] = this.getSwaggerType(p.type);
        properties[p.name].description = p.description;

        if (p.required) { required.push(p.name); }
      });

    if (!Object.keys(properties).length) { return; }

    const parameter: any = {
      in: 'body',
      name: 'body',
      schema: {
        properties: properties,
        title: `${this.getOperationId(controllerName, method.name)}Body`,
        type: 'object',
      },
    };
    if (required.length) {
      parameter.schema.required = required;
    }
    return parameter;
  }

  private buildParameter(parameter: Tsoa.Parameter): Swagger.Parameter {
    const swaggerParameter: any = {
      description: parameter.description,
      in: parameter.in,
      name: parameter.name,
      required: parameter.required,
    };

    const parameterType = this.getSwaggerType(parameter.type);
    if (parameterType.$ref) {
      swaggerParameter.schema = parameterType;
    } else {
      swaggerParameter.type = parameterType.type;
      swaggerParameter.items = parameterType.items;
    }

    if (parameterType.format) {
      swaggerParameter.format = parameterType.format;
    }

    Object.keys(parameter.validators)
      .filter(key => {
        return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
      })
      .forEach((key: string) => {
        swaggerParameter[key] = parameter.validators[key].value;
      });
    return swaggerParameter;
  }

  private buildProperties(properties: Tsoa.Property[]) {
    const swaggerProperties: { [propertyName: string]: Swagger.Schema } = {};

    properties.forEach(property => {
      const swaggerType = this.getSwaggerType(property.type);
      if (!swaggerType.$ref) {
        swaggerType.description = property.description;

        Object.keys(property.validators)
          .filter(key => {
            return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
          })
          .forEach(key => {
            swaggerType[key] = property.validators[key].value;
          });
      }
      swaggerProperties[property.name] = swaggerType as Swagger.Schema;
    });

    return swaggerProperties;
  }

  private buildAdditionalProperties(type: Tsoa.Type) {
    return this.getSwaggerType(type);
  }

  private buildOperation(controllerName: string, method: Tsoa.Method): Swagger.Operation {
    const swaggerResponses: any = {};

    method.responses.forEach((res: Tsoa.Response) => {
      swaggerResponses[res.name] = {
        description: res.description,
      };
      if (res.schema && res.schema.typeName !== 'void') {
        swaggerResponses[res.name]['schema'] = this.getSwaggerType(res.schema);
      }
      if (res.examples) {
        swaggerResponses[res.name]['examples'] = { 'application/json': res.examples };
      }
    });

    return {
      operationId: this.getOperationId(controllerName, method.name),
      produces: ['application/json'],
      responses: swaggerResponses,
    };
  }

  private getOperationId(controllerName: string, methodName: string) {
    const controllerNameWithoutSuffix = controllerName.replace(new RegExp('Controller$'), '');
    return `${controllerNameWithoutSuffix}${methodName.charAt(0).toUpperCase() + methodName.substr(1)}`;
  }

  private getSwaggerType(type: Tsoa.Type) {
    const swaggerType = this.getSwaggerTypeForPrimitiveType(type);
    if (swaggerType) {
      return swaggerType;
    }

    const arrayType = type as Tsoa.ArrayType;
    if (arrayType.elementType) {
      return this.getSwaggerTypeForArrayType(arrayType);
    }

    const enumType = type as Tsoa.EnumerateType;
    if (enumType.members) {
      return this.getSwaggerTypeForEnumType(enumType);
    }

    const refType = this.getSwaggerTypeForReferenceType(type as Tsoa.ReferenceType);
    return refType;
  }

  private getSwaggerTypeForPrimitiveType(type: Tsoa.Type): Swagger.Schema | undefined {
    const typeMap = {
      binary: { type: 'string', format: 'binary' },
      boolean: { type: 'boolean' },
      buffer: { type: 'string', format: 'byte' },
      byte: { type: 'string', format: 'byte' },
      date: { type: 'string', format: 'date' },
      datetime: { type: 'string', format: 'date-time' },
      double: { type: 'number', format: 'double' },
      float: { type: 'number', format: 'float' },
      integer: { type: 'integer', format: 'int32' },
      long: { type: 'integer', format: 'int64' },
      object: { type: 'object' },
      string: { type: 'string' },
    } as { [name: string]: Swagger.Schema };

    return typeMap[type.typeName];
  }

  private getSwaggerTypeForArrayType(arrayType: Tsoa.ArrayType): Swagger.BaseSchema {
    return { type: 'array', items: this.getSwaggerType(arrayType.elementType) };
  }

  private getSwaggerTypeForEnumType(enumType: Tsoa.EnumerateType): Swagger.BaseSchema {
    return { type: 'string', enum: enumType.members.map(member => member as string) };
  }

  private getSwaggerTypeForReferenceType(referenceType: Tsoa.ReferenceType): Swagger.BaseSchema {
    return { $ref: `#/definitions/${referenceType.typeName}` };
  }
}
