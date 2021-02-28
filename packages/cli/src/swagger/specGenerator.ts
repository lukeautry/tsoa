import { ExtendedSpecConfig } from '../cli';
import { Tsoa, assertNever, Swagger } from '@tsoa/runtime';

export abstract class SpecGenerator {
  constructor(protected readonly metadata: Tsoa.Metadata, protected readonly config: ExtendedSpecConfig) {}

  protected buildAdditionalProperties(type: Tsoa.Type) {
    return this.getSwaggerType(type);
  }

  protected getOperationId(methodName: string) {
    return methodName.charAt(0).toUpperCase() + methodName.substr(1);
  }

  public throwIfNotDataFormat(strToTest: string): Swagger.DataFormat {
    const guiltyUntilInnocent = strToTest as Swagger.DataFormat;
    if (
      guiltyUntilInnocent === 'int32' ||
      guiltyUntilInnocent === 'int64' ||
      guiltyUntilInnocent === 'float' ||
      guiltyUntilInnocent === 'double' ||
      guiltyUntilInnocent === 'byte' ||
      guiltyUntilInnocent === 'binary' ||
      guiltyUntilInnocent === 'date' ||
      guiltyUntilInnocent === 'date-time' ||
      guiltyUntilInnocent === 'password'
    ) {
      return guiltyUntilInnocent;
    } else {
      return assertNever(guiltyUntilInnocent);
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
      guiltyUntilInnocent === 'string'
    ) {
      return guiltyUntilInnocent;
    } else {
      return assertNever(guiltyUntilInnocent);
    }
  }

  protected getSwaggerType(type: Tsoa.Type): Swagger.Schema | Swagger.BaseSchema {
    if (type.dataType === 'void') {
      return this.getSwaggerTypeForVoid(type.dataType);
    } else if (type.dataType === 'refEnum' || type.dataType === 'refObject' || type.dataType === 'refAlias') {
      return this.getSwaggerTypeForReferenceType(type);
    } else if (
      type.dataType === 'any' ||
      type.dataType === 'binary' ||
      type.dataType === 'boolean' ||
      type.dataType === 'buffer' ||
      type.dataType === 'byte' ||
      type.dataType === 'date' ||
      type.dataType === 'datetime' ||
      type.dataType === 'double' ||
      type.dataType === 'float' ||
      type.dataType === 'file' ||
      type.dataType === 'integer' ||
      type.dataType === 'long' ||
      type.dataType === 'object' ||
      type.dataType === 'string'
    ) {
      return this.getSwaggerTypeForPrimitiveType(type.dataType);
    } else if (type.dataType === 'array') {
      return this.getSwaggerTypeForArrayType(type);
    } else if (type.dataType === 'enum') {
      return this.getSwaggerTypeForEnumType(type);
    } else if (type.dataType === 'union') {
      return this.getSwaggerTypeForUnionType(type);
    } else if (type.dataType === 'intersection') {
      return this.getSwaggerTypeForIntersectionType(type);
    } else if (type.dataType === 'nestedObjectLiteral') {
      return this.getSwaggerTypeForObjectLiteral(type);
    } else {
      return assertNever(type);
    }
  }

  protected abstract getSwaggerTypeForUnionType(type: Tsoa.UnionType);

  protected abstract getSwaggerTypeForIntersectionType(type: Tsoa.IntersectionType);

  protected abstract buildProperties(properties: Tsoa.Property[]): { [propertyName: string]: Swagger.Schema | Swagger.Schema3 };

  public getSwaggerTypeForObjectLiteral(objectLiteral: Tsoa.NestedObjectLiteralType): Swagger.Schema {
    const properties = this.buildProperties(objectLiteral.properties);

    const additionalProperties = objectLiteral.additionalProperties && this.getSwaggerType(objectLiteral.additionalProperties);

    const required = objectLiteral.properties.filter(prop => prop.required).map(prop => prop.name);

    // An empty list required: [] is not valid.
    // If all properties are optional, do not specify the required keyword.
    return {
      properties,
      ...(additionalProperties && { additionalProperties }),
      ...(required && required.length && { required }),
      type: 'object',
    };
  }

  protected getSwaggerTypeForReferenceType(_referenceType: Tsoa.ReferenceType): Swagger.BaseSchema {
    return {
      // Don't set additionalProperties value here since it will be set within the $ref's model when that $ref gets created
    };
  }

  protected getSwaggerTypeForVoid(_dataType: 'void'): Swagger.BaseSchema {
    // Described here: https://swagger.io/docs/specification/describing-responses/#empty
    const voidSchema = {
      // isn't allowed to have additionalProperties at all (meaning not a boolean or object)
    };
    return voidSchema;
  }

  protected determineImplicitAdditionalPropertiesValue = (): boolean => {
    if (this.config.noImplicitAdditionalProperties === 'silently-remove-extras') {
      return false;
    } else if (this.config.noImplicitAdditionalProperties === 'throw-on-extras') {
      return false;
    } else if (this.config.noImplicitAdditionalProperties === 'ignore') {
      return true;
    } else {
      return assertNever(this.config.noImplicitAdditionalProperties);
    }
  };

  protected getSwaggerTypeForPrimitiveType(dataType: Tsoa.PrimitiveTypeLiteral): Swagger.Schema {
    if (dataType === 'object') {
      if (process.env.NODE_ENV !== 'tsoa_test') {
        // eslint-disable-next-line no-console
        console.warn(`The type Object is discouraged. Please consider using an interface such as:
          export interface IStringToStringDictionary {
            [key: string]: string;
          }
          // or
          export interface IRecordOfAny {
            [key: string]: any;
          }
        `);
      }
    }

    const map: Record<Tsoa.PrimitiveTypeLiteral, Swagger.Schema> = {
      any: {
        // While the any type is discouraged, it does explicitly allows anything, so it should always allow additionalProperties
        additionalProperties: true,
      },
      binary: { type: 'string', format: 'binary' },
      boolean: { type: 'boolean' },
      buffer: { type: 'string', format: 'byte' },
      byte: { type: 'string', format: 'byte' },
      date: { type: 'string', format: 'date' },
      datetime: { type: 'string', format: 'date-time' },
      double: { type: 'number', format: 'double' },
      file: { type: 'file' },
      float: { type: 'number', format: 'float' },
      integer: { type: 'integer', format: 'int32' },
      long: { type: 'integer', format: 'int64' },
      object: {
        additionalProperties: this.determineImplicitAdditionalPropertiesValue(),
        type: 'object',
      },
      string: { type: 'string' },
    };

    return map[dataType];
  }

  protected getSwaggerTypeForArrayType(arrayType: Tsoa.ArrayType): Swagger.Schema {
    return {
      items: this.getSwaggerType(arrayType.elementType),
      type: 'array',
    };
  }

  protected determineTypesUsedInEnum(anEnum: Array<string | number | boolean | null>) {
    const typesUsedInEnum = anEnum.reduce((theSet, curr) => {
      const typeUsed = curr === null ? 'number' : typeof curr;
      theSet.add(typeUsed);
      return theSet;
    }, new Set<'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function'>());

    return typesUsedInEnum;
  }

  protected abstract getSwaggerTypeForEnumType(enumType: Tsoa.EnumType): Swagger.Schema2 | Swagger.Schema3;
}
