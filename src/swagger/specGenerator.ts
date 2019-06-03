import { Tsoa } from '../metadataGeneration/tsoa';
import { SwaggerConfig } from './../config';
import { Swagger } from './swagger';

export class SpecGenerator {
  constructor(protected readonly metadata: Tsoa.Metadata, protected readonly config: SwaggerConfig) { }

  protected buildAdditionalProperties(type: Tsoa.Type) {
    return this.getSwaggerType(type);
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

  protected getOperationId(methodName: string) {
    return methodName.charAt(0).toUpperCase() + methodName.substr(1);
  }

  protected getSwaggerType(type: Tsoa.Type): Swagger.Schema {
    const swaggerType = this.getSwaggerTypeForPrimitiveType(type);
    if (swaggerType) {
      return swaggerType;
    }

    if (type.dataType === 'array') {
      return this.getSwaggerTypeForArrayType(type as Tsoa.ArrayType);
    }

    if (type.dataType === 'enum') {
      return this.getSwaggerTypeForEnumType(type as Tsoa.EnumerateType);
    }

    return this.getSwaggerTypeForReferenceType(type as Tsoa.ReferenceType) as Swagger.Schema;
  }

  protected getSwaggerTypeForReferenceType(referenceType: Tsoa.ReferenceType): Swagger.BaseSchema {
    return {};
  }

  protected getSwaggerTypeForPrimitiveType(type: Tsoa.Type): Swagger.Schema | undefined {
    const map = {
      any: { type: 'object' },
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

    return map[type.dataType];
  }

  protected getSwaggerTypeForArrayType(arrayType: Tsoa.ArrayType): Swagger.Schema {
    return { type: 'array', items: this.getSwaggerType(arrayType.elementType) };
  }

  protected getSwaggerTypeForEnumType(enumType: Tsoa.EnumerateType): Swagger.Schema {
    return { type: 'string', enum: enumType.enums.map(member => String(member)) };
  }
}
