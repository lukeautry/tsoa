import { merge as mergeAnything } from 'merge-anything';
import { merge as deepMerge } from 'ts-deepmerge';
import { Tsoa, assertNever, Swagger } from '@tsoa/runtime';

import { SpecGenerator } from './specGenerator';
import { ExtendedSpecConfig } from '../cli';
import { isVoidType } from '../utils/isVoidType';
import { convertColonPathParams, normalisePath } from '../utils/pathUtils';
import { DEFAULT_REQUEST_MEDIA_TYPE, DEFAULT_RESPONSE_MEDIA_TYPE, getValue } from '../utils/swaggerUtils';
import { UnspecifiedObject } from '../utils/unspecifiedObject';
import { shouldIncludeValidatorInSchema } from '../utils/validatorUtils';

export class SpecGenerator2 extends SpecGenerator {
  constructor(
    protected readonly metadata: Tsoa.Metadata,
    protected readonly config: ExtendedSpecConfig,
  ) {
    super(metadata, config);
  }

  public GetSpec() {
    let spec: Swagger.Spec2 = {
      basePath: normalisePath(this.config.basePath as string, '/', undefined, false),
      consumes: [DEFAULT_REQUEST_MEDIA_TYPE],
      definitions: this.buildDefinitions(),
      info: {
        title: '',
      },
      paths: this.buildPaths(),
      produces: [DEFAULT_RESPONSE_MEDIA_TYPE],
      swagger: '2.0',
    };

    const securityDefinitions = this.config.securityDefinitions ? this.config.securityDefinitions : {};
    const supportedSchemes = ['basic', 'apiKey', 'oauth2'];
    for (const { type } of Object.values(securityDefinitions)) {
      if (!supportedSchemes.includes(type)) {
        throw new Error(`Swagger 2.0 does not support "${type}" security scheme (allowed values: ${supportedSchemes.join(',')})`);
      }
    }
    spec.securityDefinitions = securityDefinitions;

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
    if (this.config.termsOfService) {
      spec.info.termsOfService = this.config.termsOfService;
    }
    if (this.config.tags) {
      spec.tags = this.config.tags;
    }
    if (this.config.license) {
      spec.info.license = { name: this.config.license };
    }

    if (this.config.contact) {
      spec.info.contact = this.config.contact;
    }

    if (this.config.spec) {
      this.config.specMerging = this.config.specMerging || 'immediate';
      const mergeFuncs: { [key: string]: any } = {
        immediate: Object.assign,
        recursive: mergeAnything,
        deepmerge: (spec: UnspecifiedObject, merge: UnspecifiedObject): UnspecifiedObject => deepMerge(spec, merge),
      };

      spec = mergeFuncs[this.config.specMerging](spec, this.config.spec);
    }
    if (this.config.schemes) {
      spec.schemes = this.config.schemes;
    }

    return spec;
  }

  private buildDefinitions() {
    const definitions: { [definitionsName: string]: Swagger.Schema2 } = {};
    Object.keys(this.metadata.referenceTypeMap).map(typeName => {
      const referenceType = this.metadata.referenceTypeMap[typeName];
      if (referenceType.dataType === 'refObject') {
        const required = referenceType.properties.filter(p => this.isRequiredWithoutDefault(p) && !this.hasUndefined(p)).map(p => p.name);
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
        if (this.config.xEnumVarnames && referenceType.enumVarnames !== undefined && referenceType.enums.length === referenceType.enumVarnames.length) {
          definitions[referenceType.refName]['x-enum-varnames'] = referenceType.enumVarnames;
        }
        if (referenceType.example) {
          definitions[referenceType.refName].example = referenceType.example;
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

        definitions[referenceType.refName] = {
          ...(swaggerType as Swagger.Schema2),
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
        definitions[referenceType.refName]['x-deprecated'] = true;
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
          let path = normalisePath(`${normalisedControllerPath}${normalisedMethodPath}`, '/', '', false);
          path = convertColonPathParams(path);
          paths[path] = paths[path] || {};
          this.buildMethod(controller.name, method, paths[path], controller.produces);
        });
    });

    return paths;
  }

  private buildMethod(controllerName: string, method: Tsoa.Method, pathObject: any, defaultProduces?: string[]) {
    const pathMethod: Swagger.Operation = (pathObject[method.method] = this.buildOperation(controllerName, method, defaultProduces));
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

    const queriesParams: Tsoa.Parameter[] = method.parameters.filter(p => p.in === 'queries');

    pathMethod.parameters = method.parameters
      .filter(p => {
        return ['request', 'body-prop', 'res', 'queries'].indexOf(p.in) === -1;
      })
      .map(p => this.buildParameter(p));

    if (queriesParams.length > 1) {
      throw new Error('Only one queries parameter allowed per controller method.');
    }

    if (queriesParams.length === 1) {
      pathMethod.parameters.push(...this.buildQueriesParameter(queriesParams[0]));
    }

    const bodyPropParameter = this.buildBodyPropParameter(controllerName, method);
    if (bodyPropParameter) {
      pathMethod.parameters.push(bodyPropParameter);
    }
    if (pathMethod.parameters.filter((p: Swagger.BaseParameter) => p.in === 'body').length > 1) {
      throw new Error('Only one body parameter allowed per controller method.');
    }

    method.extensions.forEach(ext => (pathMethod[ext.key] = ext.value));
  }

  protected buildOperation(controllerName: string, method: Tsoa.Method, defaultProduces?: string[]): Swagger.Operation {
    const swaggerResponses: { [name: string]: Swagger.Response } = {};

    let produces: Array<string | undefined> = [];
    method.responses.forEach((res: Tsoa.Response) => {
      swaggerResponses[res.name] = {
        description: res.description,
      };
      if (res.schema && !isVoidType(res.schema)) {
        if (res.produces) {
          produces.push(...res.produces);
        }
        swaggerResponses[res.name].schema = this.getSwaggerType(res.schema) as Swagger.Schema;
      }
      if (res.examples && res.examples[0]) {
        if ((res.exampleLabels?.filter(e => e).length || 0) > 0) {
          console.warn('Example labels are not supported in OpenAPI 2');
        }
        swaggerResponses[res.name].examples = { [DEFAULT_RESPONSE_MEDIA_TYPE]: res.examples[0] };
      }

      if (res.headers) {
        const headers: { [name: string]: Swagger.Header } = {};
        if (res.headers.dataType === 'refObject' || res.headers.dataType === 'nestedObjectLiteral') {
          res.headers.properties.forEach((each: Tsoa.Property) => {
            headers[each.name] = {
              ...(this.getSwaggerType(each.type) as Swagger.Header),
              description: each.description,
            };
          });
        } else {
          assertNever(res.headers);
        }
        swaggerResponses[res.name].headers = headers;
      }
    });

    produces = Array.from(new Set(produces.filter(p => p !== undefined)));
    if (produces.length === 0) {
      produces = defaultProduces || [DEFAULT_RESPONSE_MEDIA_TYPE];
    }

    const operation: Swagger.Operation = {
      operationId: this.getOperationId(controllerName, method),
      produces: produces as string[],
      responses: swaggerResponses,
    };

    const hasBody = method.parameters.some(p => p.in === 'body');
    const hasFormData = method.parameters.some(p => p.in === 'formData');
    if (hasBody || hasFormData) {
      operation.consumes = [];
      if (hasBody) {
        operation.consumes.push(method.consumes || DEFAULT_REQUEST_MEDIA_TYPE);
      }
      if (hasFormData) {
        operation.consumes.push('multipart/form-data');
      }
    }

    return operation;
  }

  private buildBodyPropParameter(controllerName: string, method: Tsoa.Method) {
    const properties = {} as { [name: string]: Swagger.Schema2 };
    const required: string[] = [];

    method.parameters
      .filter(p => p.in === 'body-prop')
      .forEach(p => {
        properties[p.name] = this.getSwaggerType(p.type) as Swagger.Schema2;
        properties[p.name].default = p.default;
        properties[p.name].description = p.description;
        properties[p.name].example = p.example === undefined ? undefined : p.example[0];

        if (this.isRequiredWithoutDefault(p)) {
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
        title: `${this.getOperationId(controllerName, method)}Body`,
        type: 'object',
      },
    } as Swagger.Parameter;
    if (required.length) {
      parameter.schema.required = required;
    }
    return parameter;
  }

  private buildQueriesParameter(source: Tsoa.Parameter): Swagger.Parameter2[] {
    if (source.type.dataType === 'refObject' || source.type.dataType === 'nestedObjectLiteral') {
      const properties = source.type.properties;

      return properties.map(property => this.buildParameter(this.queriesPropertyToQueryParameter(property)));
    }
    throw new Error(`Queries '${source.name}' parameter must be an object.`);
  }

  private buildParameter(source: Tsoa.Parameter): Swagger.Parameter2 {
    let parameter = {
      default: source.default,
      description: source.description,
      in: source.in,
      name: source.name,
      required: this.isRequiredWithoutDefault(source),
    } as Swagger.Parameter2;
    if (source.deprecated) {
      parameter['x-deprecated'] = true;
    }

    let type = source.type;

    if (source.in !== 'body' && source.type.dataType === 'refEnum') {
      // swagger does not support referencing enums
      // (except for body parameters), so we have to inline it

      type = {
        dataType: 'enum',
        enums: source.type.enums,
      };
    }

    const parameterType = this.getSwaggerType(type);
    if (parameterType.format) {
      parameter.format = this.throwIfNotDataFormat(parameterType.format);
    }

    if (Swagger.isQueryParameter(parameter) && parameterType.type === 'array') {
      parameter.collectionFormat = 'multi';
    }

    if (parameterType.$ref) {
      parameter.schema = parameterType as Swagger.Schema2;
      return parameter;
    }

    const validatorObjs: Partial<Record<Tsoa.SchemaValidatorKey, unknown>> = {};
    Object.keys(source.validators)
      .filter(shouldIncludeValidatorInSchema)
      .forEach(key => {
        validatorObjs[key] = source.validators[key]!.value;
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

  protected buildProperties(source: Tsoa.Property[]) {
    const properties: { [propertyName: string]: Swagger.Schema2 } = {};

    source.forEach(property => {
      let swaggerType = this.getSwaggerType(property.type) as Swagger.Schema2;
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
        swaggerType['x-deprecated'] = true;
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

  protected getSwaggerTypeForUnionType(type: Tsoa.UnionType) {
    const typesWithoutUndefined = type.types.filter(x => x.dataType !== 'undefined');
    // Backwards compatible representation of a literal enumeration
    if (typesWithoutUndefined.every(subType => subType.dataType === 'enum')) {
      const mergedEnum: Tsoa.EnumType = { dataType: 'enum', enums: [] };
      typesWithoutUndefined.forEach(t => {
        mergedEnum.enums = [...mergedEnum.enums, ...(t as Tsoa.EnumType).enums];
      });
      return this.getSwaggerTypeForEnumType(mergedEnum);
    } else if (typesWithoutUndefined.length === 2 && typesWithoutUndefined.find(typeInUnion => typeInUnion.dataType === 'enum' && typeInUnion.enums.includes(null))) {
      // Backwards compatible representation of dataType or null, $ref does not allow any sibling attributes, so we have to bail out
      const nullEnumIndex = typesWithoutUndefined.findIndex(type => type.dataType === 'enum' && type.enums.includes(null));
      const typeIndex = nullEnumIndex === 1 ? 0 : 1;
      const swaggerType = this.getSwaggerType(typesWithoutUndefined[typeIndex]);
      const isRef = !!swaggerType.$ref;

      if (isRef) {
        return { type: 'object' };
      } else {
        swaggerType['x-nullable'] = true;
        return swaggerType;
      }
    } else if (process.env.NODE_ENV !== 'tsoa_test') {
      // eslint-disable-next-line no-console
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
          // eslint-disable-next-line no-console
          console.warn('Swagger 2.0 does not fully support this kind of intersection types. If you would like to take advantage of this, please change tsoa.json\'s "specVersion" to 3.');
        return { ...acc };
      }
    }, {});
    return { type: 'object', properties };
  }

  protected getSwaggerTypeForReferenceType(referenceType: Tsoa.ReferenceType): Swagger.BaseSchema {
    return { $ref: `#/definitions/${encodeURIComponent(referenceType.refName)}` };
  }

  private decideEnumType(anEnum: Array<string | number>, nameOfEnum: string): 'string' | 'number' {
    const typesUsedInEnum = this.determineTypesUsedInEnum(anEnum);

    const badEnumErrorMessage = () => {
      const valuesDelimited = Array.from(typesUsedInEnum).join(',');
      return `Enums can only have string or number values, but enum ${nameOfEnum} had ${valuesDelimited}`;
    };

    let enumTypeForSwagger: 'string' | 'number';
    if (typesUsedInEnum.has('string') && typesUsedInEnum.size === 1) {
      enumTypeForSwagger = 'string';
    } else if (typesUsedInEnum.has('number') && typesUsedInEnum.size === 1) {
      enumTypeForSwagger = 'number';
    } else {
      throw new Error(badEnumErrorMessage());
    }
    return enumTypeForSwagger;
  }

  protected getSwaggerTypeForEnumType(enumType: Tsoa.EnumType): Swagger.Schema2 {
    const types = this.determineTypesUsedInEnum(enumType.enums);
    const type = types.size === 1 ? (types.values().next().value as SetTypes<typeof types>) : 'string';
    const nullable = enumType.enums.includes(null) ? true : false;
    return { type, enum: enumType.enums.map(member => getValue(type, member)), ['x-nullable']: nullable };
  }
}

type SetTypes<Type> = Type extends Set<infer Item> ? Item : never;
