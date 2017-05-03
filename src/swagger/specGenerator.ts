import { SwaggerConfig } from './../config';
import { Metadata, Type, ArrayType, ReferenceType, EnumerateType, Property, Method, Parameter, ResponseType } from '../metadataGeneration/metadataGenerator';
import { Swagger } from './swagger';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';

export class SpecGenerator {
  constructor(private readonly metadata: Metadata, private readonly config: SwaggerConfig) { }

  public GenerateJson(swaggerDir: string) {
    mkdirp(swaggerDir, (dirErr: any) => {
      if (dirErr) {
        throw dirErr;
      }

      fs.writeFile(`${swaggerDir}/swagger.json`, JSON.stringify(this.GetSpec(), null, '\t'), (err: any) => {
        if (err) {
          throw new Error(err.toString());
        };
      });
    });
  }

  public GetSpec() {
    let spec: Swagger.Spec = {
      basePath: this.config.basePath,
      consumes: ['application/json'],
      definitions: this.buildDefinitions(),
      info: {},
      paths: this.buildPaths(),
      produces: ['application/json'],
      swagger: '2.0'
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
      definitions[referenceType.typeName] = {
        description: referenceType.description,
        properties: this.buildProperties(referenceType.properties),
        required: referenceType.properties.filter(p => p.required).map(p => p.name),
        type: 'object'
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
        const path = `${controller.path ? `/${controller.path}` : ''}${method.path}`.replace(/\/\//g,'/');
        paths[path] = paths[path] || {};
        this.buildPathMethod(controller.name, method, paths[path]);
      });
    });

    return paths;
  }

  private buildPathMethod(controllerName: string, method: Method, pathObject: any) {
    const pathMethod: any = pathObject[method.method] = this.buildOperation(controllerName, method);
    pathMethod.description = method.description;

    if (method.deprecated) { pathMethod.deprecated = method.deprecated; }
    if (method.tags.length) { pathMethod.tags = method.tags; }
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

  private buildBodyPropParameter(controllerName: string, method: Method) {
    const properties: any = {};
    const required: string[] = [];

    method.parameters
      .filter(p => p.in === 'body-prop')
      .forEach(p => {
        properties[p.name] = this.getSwaggerType(p.type);
        properties[p.name].description = p.description;

        if (p.required) { required.push(p.name); }
      });

    if (!Object.keys(properties).length) { return; };

    const parameter: any = {
      in: 'body',
      name: 'body',
      schema: {
        properties: properties,
        title: `${this.getOperationId(controllerName, method.name)}Body`,
        type: 'object'
      }
    };
    if (required.length) {
      parameter.schema.required = required;
    }
    return parameter;
  }

  private buildParameter(parameter: Parameter): Swagger.Parameter {
    const swaggerParameter: any = {
      description: parameter.description,
      in: parameter.in,
      name: parameter.name,
      required: parameter.required
    };

    const parameterType = this.getSwaggerType(parameter.type);
    if (parameterType.$ref) {
      swaggerParameter.schema = parameterType;
    } else {
      swaggerParameter.type = parameterType.type;
    }

    if (parameterType.format) { swaggerParameter.format = parameterType.format; }

    return swaggerParameter;
  }

  private buildProperties(properties: Property[]) {
    const swaggerProperties: { [propertyName: string]: Swagger.Schema } = {};

    properties.forEach(property => {
      const swaggerType = this.getSwaggerType(property.type);
      if (!swaggerType.$ref) {
        swaggerType.description = property.description;
      }
      swaggerProperties[property.name] = swaggerType;
    });

    return swaggerProperties;
  }

  private buildAdditionalProperties(properties: Property[]) {
    const swaggerAdditionalProperties: { [ref: string]: string } = {};

    properties.forEach(property => {
      const swaggerType = this.getSwaggerType(property.type);
      if (swaggerType.$ref) {
        swaggerAdditionalProperties['$ref'] = swaggerType.$ref;
      }
    });

    return swaggerAdditionalProperties;
  }

  private buildOperation(controllerName: string, method: Method) {
    const responses: any = {};

    method.responses.forEach((res: ResponseType) => {
      responses[res.name] = {
        description: res.description
      };
      if (res.schema && this.getSwaggerType(res.schema).type !== 'void') {
        responses[res.name]['schema'] = this.getSwaggerType(res.schema);
      }
      if (res.examples) {
        responses[res.name]['examples'] = { 'application/json': res.examples };
      }
    });

    return {
      operationId: this.getOperationId(controllerName, method.name),
      produces: ['application/json'],
      responses: responses
    };
  }

  private getOperationId(controllerName: string, methodName: string) {
    const controllerNameWithoutSuffix = controllerName.replace(new RegExp('Controller$'), '');
    return `${controllerNameWithoutSuffix}${methodName.charAt(0).toUpperCase() + methodName.substr(1)}`;
  }

  private getSwaggerType(type: Type) {
    const swaggerType = this.getSwaggerTypeForPrimitiveType(type);
    if (swaggerType) {
      return swaggerType;
    }

    const arrayType = type as ArrayType;
    if (arrayType.elementType) {
      return this.getSwaggerTypeForArrayType(arrayType);
    }

    const enumType = type as EnumerateType;
    if (enumType.enumMembers) {
      return this.getSwaggerTypeForEnumType(enumType);
    }

    const refType = this.getSwaggerTypeForReferenceType(type as ReferenceType);
    return refType;
  }

  private getSwaggerTypeForPrimitiveType(type: Type) {
    const typeMap: { [name: string]: Swagger.Schema } = {
      binary: { type: 'string', format: 'binary' },
      boolean: { type: 'boolean' },
      buffer: { type: 'string', format: 'base64' },
      byte: { type: 'string', format: 'byte' },
      date: { type: 'string', format: 'date' },
      datetime: { type: 'string', format: 'date-time' },
      double: { type: 'number', format: 'double' },
      float: { type: 'number', format: 'float' },
      integer: { type: 'integer', format: 'int32' },
      long: { type: 'integer', format: 'int64' },
      object: { type: 'object' },
      string: { type: 'string' },
      void: { type: 'void' }
    };

    return typeMap[type.typeName];
  }

  private getSwaggerTypeForArrayType(arrayType: ArrayType): Swagger.Schema {
    return { type: 'array', items: this.getSwaggerType(arrayType.elementType) };
  }

  private getSwaggerTypeForEnumType(enumType: EnumerateType): Swagger.Schema {
    return { type: 'string', enum: enumType.enumMembers.map( member => member as string ) as [string] };
  }

  private getSwaggerTypeForReferenceType(referenceType: ReferenceType): Swagger.Schema {
    return { $ref: `#/definitions/${referenceType.typeName}` };
  }
}
