import { Tsoa } from '../metadataGeneration/tsoa';
import { assertNever } from '../utils/assertNever';
import { SwaggerConfig } from './../config';
import { normalisePath } from './../utils/pathUtils';
import { SpecGenerator } from './specGenerator';
import { Swagger } from './swagger';

export class SpecGenerator2 extends SpecGenerator {
  constructor(protected readonly metadata: Tsoa.Metadata, protected readonly config: SwaggerConfig) {
    super(metadata, config);
  }

  public GetSpec() {
    let spec: Swagger.Spec2 = {
      basePath: normalisePath(this.config.basePath as string, '/', undefined, false),
      consumes: ['application/json'],
      definitions: this.buildDefinitions(),
      info: {
        title: '',
      },
      paths: this.buildPaths(),
      produces: ['application/json'],
      swagger: '2.0',
    };

    spec.securityDefinitions = this.config.securityDefinitions ? this.config.securityDefinitions : {};

    if (this.config.name) {
      spec.info.title = this.config.name;
    }
    if (this.config.version) {
      spec.info.version = this.config.version;
    }
    if (this.config.host) {
      spec.host = this.config.host;
    }
    if (this.config.description) {
      spec.info.description = this.config.description;
    }
    if (this.config.tags) {
      spec.tags = this.config.tags;
    }
    if (this.config.license) {
      spec.info.license = { name: this.config.license };
    }
    if (this.config.spec) {
      this.config.specMerging = this.config.specMerging || 'immediate';
      const mergeFuncs: { [key: string]: any } = {
        immediate: Object.assign,
        recursive: require('merge').recursive,
      };

      spec = mergeFuncs[this.config.specMerging](spec, this.config.spec);
    }
    if (this.config.schemes) {
      spec.schemes = this.config.schemes;
    }

    return spec;
  }

  private buildDefinitions() {
    const definitions: { [definitionsName: string]: Swagger.Schema } = {};
    Object.keys(this.metadata.referenceTypeMap).map(typeName => {
      const referenceType = this.metadata.referenceTypeMap[typeName];

      if (referenceType.dataType === 'refObject') {
        const required = referenceType.properties.filter(p => p.required).map(p => p.name);
        definitions[referenceType.refName] = {
          description: referenceType.description,
          properties: this.buildProperties(referenceType.properties),
          required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
          type: 'object',
        };

        if (referenceType.additionalProperties) {
          definitions[referenceType.refName].additionalProperties = this.buildAdditionalProperties(referenceType.additionalProperties);
        } else {
          // Since additionalProperties was not explicitly set in the TypeScript interface for this model
          //      ...we need to make a decision
          definitions[referenceType.refName].additionalProperties = this.determineImplicitAdditionalPropertiesValue();
        }

        if (referenceType.example) {
          definitions[referenceType.refName].example = referenceType.example;
        }
      } else if (referenceType.dataType === 'refEnum') {
        definitions[referenceType.refName] = {
          description: referenceType.description,
          enum: referenceType.enums,
          type: this.decideEnumType(referenceType.enums, referenceType.refName),
        };
      } else if (referenceType.dataType === 'refAlias') {
        const swaggerType = this.getSwaggerType(referenceType.type);
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

        definitions[referenceType.refName] = {
          ...(swaggerType as Swagger.Schema),
          default: referenceType.default || swaggerType.default,
          example: referenceType.example,
          description: referenceType.description,
          ...validators,
        };
      } else {
        assertNever(referenceType);
      }
    });

    return definitions;
  }

  private buildPaths() {
    const paths: { [pathName: string]: Swagger.Path } = {};

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
    const pathMethod: Swagger.Operation = (pathObject[method.method] = this.buildOperation(controllerName, method));
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

  protected buildOperation(controllerName: string, method: Tsoa.Method): Swagger.Operation {
    const swaggerResponses: any = {};

    method.responses.forEach((res: Tsoa.Response) => {
      swaggerResponses[res.name] = {
        description: res.description,
      };
      if (res.schema && res.schema.dataType !== 'void') {
        swaggerResponses[res.name].schema = this.getSwaggerType(res.schema);
      }
      if (res.examples) {
        swaggerResponses[res.name].examples = { 'application/json': res.examples };
      }
    });

    return {
      operationId: this.getOperationId(method.name),
      produces: ['application/json'],
      responses: swaggerResponses,
    };
  }

  private buildBodyPropParameter(controllerName: string, method: Tsoa.Method) {
    const properties = {} as { [name: string]: Swagger.Schema | Swagger.BaseSchema };
    const required: string[] = [];

    method.parameters
      .filter(p => p.in === 'body-prop')
      .forEach(p => {
        properties[p.name] = this.getSwaggerType(p.type);
        properties[p.name].default = p.default;
        properties[p.name].description = p.description;

        if (p.required) {
          required.push(p.name);
        }
      });

    if (!Object.keys(properties).length) {
      return;
    }

    const parameter = {
      in: 'body',
      name: 'body',
      schema: {
        properties,
        title: `${this.getOperationId(method.name)}Body`,
        type: 'object',
      },
    } as Swagger.Parameter;
    if (required.length) {
      parameter.schema.required = required;
    }
    return parameter;
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

    if (source.in === 'body' && source.type.dataType === 'array') {
      parameter.schema = {
        items: parameterType.items,
        type: 'array',
      };
    } else {
      if (source.type.dataType === 'any') {
        if (source.in === 'body') {
          parameter.schema = { type: 'object' };
        } else {
          parameter.type = 'string';
        }
      } else {
        if (parameterType.type) {
          parameter.type = this.throwIfNotDataType(parameterType.type);
        }
        parameter.items = parameterType.items;
        parameter.enum = parameterType.enum;
      }
    }

    if (parameter.schema) {
      parameter.schema = Object.assign({}, parameter.schema, validatorObjs);
    } else {
      parameter = Object.assign({}, parameter, validatorObjs);
    }

    return parameter;
  }

  private buildProperties(source: Tsoa.Property[]) {
    const properties: { [propertyName: string]: Swagger.Schema } = {};

    source.forEach(property => {
      const swaggerType = this.getSwaggerType(property.type);
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
        swaggerType['x-nullable'] = true;
      }

      properties[property.name] = swaggerType as Swagger.Schema;
    });

    return properties;
  }

  protected getSwaggerTypeForUnionType(type: Tsoa.UnionType) {
    if (type.types.every(subType => subType.dataType === 'enum')) {
      const mergedEnum: Tsoa.EnumType = { dataType: 'enum', enums: [] };
      type.types.forEach(t => {
        mergedEnum.enums = [...mergedEnum.enums, ...(t as Tsoa.EnumType).enums];
      });
      return this.getSwaggerTypeForEnumType(mergedEnum);
    } else if (process.env.NODE_ENV !== 'tsoa_test') {
      // tslint:disable-next-line: no-console
      console.warn('Swagger 2.0 does not support union types beyond string literals.\n' + 'If you would like to take advantage of this, please change tsoa.json\'s "specVersion" to 3.');
    }
    return { type: 'object' };
  }
  protected getSwaggerTypeForIntersectionType(type: Tsoa.IntersectionType) {
    const properties = type.types.reduce((acc, type) => {
      if (type.dataType === 'refObject') {
        let refType = type;
        refType = this.metadata.referenceTypeMap[refType.refName] as Tsoa.RefObjectType;

        const props =
          refType &&
          refType.properties &&
          refType.properties.reduce((acc, prop) => {
            return {
              ...acc,
              [prop.name]: this.getSwaggerType(prop.type),
            };
          }, {});
        return { ...acc, ...props };
      } else {
        process.env.NODE_ENV !== 'tsoa_test' &&
          // tslint:disable-next-line: no-console
          console.warn('Swagger 2.0 does not fully support this kind of intersection types. If you would like to take advantage of this, please change tsoa.json\'s "specVersion" to 3.');
        return { ...acc };
      }
    }, {});
    return { type: 'object', properties };
  }

  protected getSwaggerTypeForReferenceType(referenceType: Tsoa.ReferenceType): Swagger.BaseSchema {
    return { $ref: `#/definitions/${referenceType.refName}` };
  }
}
