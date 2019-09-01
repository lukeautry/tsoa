import * as moment from 'moment';
import * as validator from 'validator';
import { assertNever } from '../utils/assertNever';
import { warnAdditionalPropertiesDeprecation } from '../utils/deprecations';
import { SwaggerConfigRelatedToRoutes } from './routeGenerator';
import { isDefaultForAdditionalPropertiesAllowed, TsoaRoute } from './tsoa-route';

// for backwards compatibility with custom templates
export function ValidateParam(
  property: TsoaRoute.PropertySchema,
  value: any,
  generatedModels: TsoaRoute.Models,
  name = '',
  fieldErrors: FieldErrors,
  parent = '',
  swaggerConfig: SwaggerConfigRelatedToRoutes,
) {
  return new ValidationService(generatedModels).ValidateParam(property, value, name, fieldErrors, parent, swaggerConfig);
}

export class ValidationService {
  constructor(private readonly models: TsoaRoute.Models) {}

  public ValidateParam(property: TsoaRoute.PropertySchema, value: any, name = '', fieldErrors: FieldErrors, parent = '', minimalSwaggerConfig: SwaggerConfigRelatedToRoutes) {
    if (value === undefined || value === null) {
      if (property.required) {
        let message = `'${name}' is required`;
        if (property.validators) {
          const validators = property.validators;
          Object.keys(validators).forEach((key: string) => {
            const errorMsg = validators[key].errorMsg;
            if (key.startsWith('is') && errorMsg) {
              message = errorMsg;
            }
          });
        }
        fieldErrors[parent + name] = {
          message,
          value,
        };
        return;
      } else {
        return property.default !== undefined ? property.default : value;
      }
    }

    switch (property.dataType) {
      case 'string':
        return this.validateString(name, value, fieldErrors, property.validators, parent);
      case 'boolean':
        return this.validateBool(name, value, fieldErrors, property.validators, parent);
      case 'integer':
      case 'long':
        return this.validateInt(name, value, fieldErrors, property.validators, parent);
      case 'float':
      case 'double':
        return this.validateFloat(name, value, fieldErrors, property.validators, parent);
      case 'enum':
        return this.validateEnum(name, value, fieldErrors, property.enums, parent);
      case 'array':
        return this.validateArray(name, value, fieldErrors, minimalSwaggerConfig, property.array, property.validators, parent);
      case 'date':
        return this.validateDate(name, value, fieldErrors, property.validators, parent);
      case 'datetime':
        return this.validateDateTime(name, value, fieldErrors, property.validators, parent);
      case 'buffer':
        return this.validateBuffer(name, value);
      case 'union':
        return this.validateUnion(name, value, fieldErrors, minimalSwaggerConfig, property.subSchemas, parent);
      case 'intersection':
        return this.validateIntersection(name, value, fieldErrors, minimalSwaggerConfig, property.subSchemas, parent);
      case 'any':
        return value;
      case 'nestedObjectLiteral':
        return this.validateNestedObjectLiteral(name, value, fieldErrors, minimalSwaggerConfig, property.nestedProperties, property.additionalProperties, parent);
      default:
        if (property.ref) {
          return this.validateModel({ name, value, refName: property.ref, fieldErrors, parent, minimalSwaggerConfig });
        }
        return value;
    }
  }

  public validateNestedObjectLiteral(
    name: string,
    value: any,
    fieldErrors: FieldErrors,
    swaggerConfig: SwaggerConfigRelatedToRoutes,
    nestedProperties: { [name: string]: TsoaRoute.PropertySchema } | undefined,
    additionalProperties: TsoaRoute.PropertySchema | boolean | undefined,
    parent: string,
  ) {
    if (!(value instanceof Object)) {
      fieldErrors[parent + name] = {
        message: `invalid object`,
        value,
      };
      return;
    }

    if (!nestedProperties) {
      throw new Error(
        'internal tsoa error: ' +
          'the metadata that was generated should have had nested property schemas since it’s for a nested object,' +
          'however it did not. ' +
          'Please file an issue with tsoa at https://github.com/lukeautry/tsoa/issues',
      );
    }

    const propHandling = this.resolveAdditionalPropSetting(swaggerConfig);
    if (propHandling !== 'ignore') {
      const excessProps = this.getExcessPropertiesFor({ properties: nestedProperties, additionalProperties }, Object.keys(value), swaggerConfig);
      if (excessProps.length > 0) {
        if (propHandling === 'silently-remove-extras') {
          excessProps.forEach(excessProp => {
            delete value[excessProp];
          });
        }
        if (propHandling === 'throw-on-extras') {
          fieldErrors[parent + name] = {
            message: `"${excessProps}" is an excess property and therefore is not allowed`,
            value: excessProps.reduce((acc, propName) => ({ [propName]: value[propName], ...acc }), {}),
          };
        }
      }
    }

    Object.keys(value).forEach(key => {
      if (!nestedProperties[key]) {
        if (additionalProperties && additionalProperties !== true) {
          return this.ValidateParam(additionalProperties, value[key], key, fieldErrors, parent + name + '.', swaggerConfig);
        } else {
          return key;
        }
      }

      return this.ValidateParam(nestedProperties[key], value[key], key, fieldErrors, parent + name + '.', swaggerConfig);
    });

    return value;
  }

  public validateInt(name: string, value: any, fieldErrors: FieldErrors, validators?: IntegerValidator, parent = '') {
    if (!validator.isInt(String(value))) {
      let message = `invalid integer number`;
      if (validators) {
        if (validators.isInt && validators.isInt.errorMsg) {
          message = validators.isInt.errorMsg;
        }
        if (validators.isLong && validators.isLong.errorMsg) {
          message = validators.isLong.errorMsg;
        }
      }
      fieldErrors[parent + name] = {
        message,
        value,
      };
      return;
    }

    const numberValue = validator.toInt(String(value), 10);
    if (!validators) {
      return numberValue;
    }
    if (validators.minimum && validators.minimum.value !== undefined) {
      if (validators.minimum.value > numberValue) {
        fieldErrors[parent + name] = {
          message: validators.minimum.errorMsg || `min ${validators.minimum.value}`,
          value,
        };
        return;
      }
    }
    if (validators.maximum && validators.maximum.value !== undefined) {
      if (validators.maximum.value < numberValue) {
        fieldErrors[parent + name] = {
          message: validators.maximum.errorMsg || `max ${validators.maximum.value}`,
          value,
        };
        return;
      }
    }
    return numberValue;
  }

  public validateFloat(name: string, value: any, fieldErrors: FieldErrors, validators?: FloatValidator, parent = '') {
    if (!validator.isFloat(String(value))) {
      let message = 'invalid float number';
      if (validators) {
        if (validators.isFloat && validators.isFloat.errorMsg) {
          message = validators.isFloat.errorMsg;
        }
        if (validators.isDouble && validators.isDouble.errorMsg) {
          message = validators.isDouble.errorMsg;
        }
      }
      fieldErrors[parent + name] = {
        message,
        value,
      };
      return;
    }

    const numberValue = validator.toFloat(String(value));
    if (!validators) {
      return numberValue;
    }
    if (validators.minimum && validators.minimum.value !== undefined) {
      if (validators.minimum.value > numberValue) {
        fieldErrors[parent + name] = {
          message: validators.minimum.errorMsg || `min ${validators.minimum.value}`,
          value,
        };
        return;
      }
    }
    if (validators.maximum && validators.maximum.value !== undefined) {
      if (validators.maximum.value < numberValue) {
        fieldErrors[parent + name] = {
          message: validators.maximum.errorMsg || `max ${validators.maximum.value}`,
          value,
        };
        return;
      }
    }
    return numberValue;
  }

  public validateEnum(name: string, value: any, fieldErrors: FieldErrors, members?: string[], parent = ''): any {
    if (!members || members.length === 0) {
      fieldErrors[parent + name] = {
        message: 'no member',
        value,
      };
      return;
    }
    const enumValue = members.find(member => {
      return member === String(value);
    });
    if (!enumValue) {
      fieldErrors[parent + name] = {
        message: `should be one of the following; ['${members.join(`', '`)}']`,
        value,
      };
      return;
    }
    return value;
  }

  public validateDate(name: string, value: any, fieldErrors: FieldErrors, validators?: DateValidator, parent = '') {
    const momentDate = moment(String(value), moment.ISO_8601, true);
    if (!momentDate.isValid()) {
      const message = validators && validators.isDate && validators.isDate.errorMsg ? validators.isDate.errorMsg : `invalid ISO 8601 date format, i.e. YYYY-MM-DD`;
      fieldErrors[parent + name] = {
        message,
        value,
      };
      return;
    }

    const dateValue = new Date(String(value));
    if (!validators) {
      return dateValue;
    }
    if (validators.minDate && validators.minDate.value) {
      const minDate = new Date(validators.minDate.value);
      if (minDate.getTime() > dateValue.getTime()) {
        fieldErrors[parent + name] = {
          message: validators.minDate.errorMsg || `minDate '${validators.minDate.value}'`,
          value,
        };
        return;
      }
    }
    if (validators.maxDate && validators.maxDate.value) {
      const maxDate = new Date(validators.maxDate.value);
      if (maxDate.getTime() < dateValue.getTime()) {
        fieldErrors[parent + name] = {
          message: validators.maxDate.errorMsg || `maxDate '${validators.maxDate.value}'`,
          value,
        };
        return;
      }
    }
    return dateValue;
  }

  public validateDateTime(name: string, value: any, fieldErrors: FieldErrors, validators?: DateTimeValidator, parent = '') {
    const momentDateTime = moment(String(value), moment.ISO_8601, true);
    if (!momentDateTime.isValid()) {
      const message = validators && validators.isDateTime && validators.isDateTime.errorMsg ? validators.isDateTime.errorMsg : `invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss`;
      fieldErrors[parent + name] = {
        message,
        value,
      };
      return;
    }

    const datetimeValue = new Date(String(value));
    if (!validators) {
      return datetimeValue;
    }
    if (validators.minDate && validators.minDate.value) {
      const minDate = new Date(validators.minDate.value);
      if (minDate.getTime() > datetimeValue.getTime()) {
        fieldErrors[parent + name] = {
          message: validators.minDate.errorMsg || `minDate '${validators.minDate.value}'`,
          value,
        };
        return;
      }
    }
    if (validators.maxDate && validators.maxDate.value) {
      const maxDate = new Date(validators.maxDate.value);
      if (maxDate.getTime() < datetimeValue.getTime()) {
        fieldErrors[parent + name] = {
          message: validators.maxDate.errorMsg || `maxDate '${validators.maxDate.value}'`,
          value,
        };
        return;
      }
    }
    return datetimeValue;
  }

  public validateString(name: string, value: any, fieldErrors: FieldErrors, validators?: StringValidator, parent = '') {
    if (typeof value !== 'string') {
      const message = validators && validators.isString && validators.isString.errorMsg ? validators.isString.errorMsg : `invalid string value`;
      fieldErrors[parent + name] = {
        message,
        value,
      };
      return;
    }

    const stringValue = String(value);
    if (!validators) {
      return stringValue;
    }
    if (validators.minLength && validators.minLength.value !== undefined) {
      if (validators.minLength.value > stringValue.length) {
        fieldErrors[parent + name] = {
          message: validators.minLength.errorMsg || `minLength ${validators.minLength.value}`,
          value,
        };
        return;
      }
    }
    if (validators.maxLength && validators.maxLength.value !== undefined) {
      if (validators.maxLength.value < stringValue.length) {
        fieldErrors[parent + name] = {
          message: validators.maxLength.errorMsg || `maxLength ${validators.maxLength.value}`,
          value,
        };
        return;
      }
    }
    if (validators.pattern && validators.pattern.value) {
      if (!validator.matches(String(stringValue), validators.pattern.value)) {
        fieldErrors[parent + name] = {
          message: validators.pattern.errorMsg || `Not match in '${validators.pattern.value}'`,
          value,
        };
        return;
      }
    }
    return stringValue;
  }

  public validateBool(name: string, value: any, fieldErrors: FieldErrors, validators?: BooleanValidator, parent = '') {
    if (value === undefined || value === null) {
      return false;
    }
    if (value === true || value === false) {
      return value;
    }
    if (String(value).toLowerCase() === 'true') {
      return true;
    }
    if (String(value).toLowerCase() === 'false') {
      return false;
    }

    const message = validators && validators.isArray && validators.isArray.errorMsg ? validators.isArray.errorMsg : `invalid boolean value`;
    fieldErrors[parent + name] = {
      message,
      value,
    };
    return;
  }

  public validateArray(name: string, value: any[], fieldErrors: FieldErrors, swaggerConfig: SwaggerConfigRelatedToRoutes, schema?: TsoaRoute.PropertySchema, validators?: ArrayValidator, parent = '') {
    if (!schema || value === undefined || value === null) {
      const message = validators && validators.isArray && validators.isArray.errorMsg ? validators.isArray.errorMsg : `invalid array`;
      fieldErrors[parent + name] = {
        message,
        value,
      };
      return;
    }

    let arrayValue = [] as any[];
    if (Array.isArray(value)) {
      arrayValue = value.map((elementValue, index) => {
        return this.ValidateParam(schema, elementValue, `$${index}`, fieldErrors, name + '.', swaggerConfig);
      });
    } else {
      arrayValue = [this.ValidateParam(schema, value, '$0', fieldErrors, name + '.', swaggerConfig)];
    }

    if (!validators) {
      return arrayValue;
    }
    if (validators.minItems && validators.minItems.value) {
      if (validators.minItems.value > arrayValue.length) {
        fieldErrors[parent + name] = {
          message: validators.minItems.errorMsg || `minItems ${validators.minItems.value}`,
          value,
        };
        return;
      }
    }
    if (validators.maxItems && validators.maxItems.value) {
      if (validators.maxItems.value < arrayValue.length) {
        fieldErrors[parent + name] = {
          message: validators.maxItems.errorMsg || `maxItems ${validators.maxItems.value}`,
          value,
        };
        return;
      }
    }
    if (validators.uniqueItems) {
      const unique = arrayValue.some((elem, index, arr) => {
        const indexOf = arr.indexOf(elem);
        return indexOf > -1 && indexOf !== index;
      });
      if (unique) {
        fieldErrors[parent + name] = {
          message: validators.uniqueItems.errorMsg || `required unique array`,
          value,
        };
        return;
      }
    }
    return arrayValue;
  }

  public validateBuffer(name: string, value: string) {
    return new Buffer(value);
  }

  public validateUnion(name: string, value: any, fieldErrors: FieldErrors, swaggerConfig: SwaggerConfigRelatedToRoutes, subSchemas: TsoaRoute.PropertySchema[] | undefined, parent = ''): any {
    if (!subSchemas) {
      throw new Error(
        'internal tsoa error: ' +
          'the metadata that was generated should have had sub schemas since it’s for a union, however it did not. ' +
          'Please file an issue with tsoa at https://github.com/lukeautry/tsoa/issues',
      );
    }

    const subFieldErrors: FieldErrors[] = [];
    let cleanValues = {};

    subSchemas.forEach(subSchema => {
      const subFieldError: FieldErrors = {};
      const cleanValue = this.ValidateParam(subSchema, JSON.parse(JSON.stringify(value)), name, subFieldError, parent, swaggerConfig);
      subFieldErrors.push(subFieldError);
      cleanValues = {
        ...cleanValues,
        ...cleanValue,
      };
    });

    if (subFieldErrors.length > 0 && !subFieldErrors.some(subFieldError => Object.keys(subFieldError).length === 0)) {
      fieldErrors[parent + name] = {
        message: `Could not match the union against any of the items. Issues: ${JSON.stringify(subFieldErrors)}`,
        value,
      };
      return;
    }

    if (value instanceof Object && this.resolveAdditionalPropSetting(swaggerConfig) === 'silently-remove-extras') {
      return cleanValues;
    }

    return value;
  }

  public validateIntersection(name: string, value: any, fieldErrors: FieldErrors, swaggerConfig: SwaggerConfigRelatedToRoutes, subSchemas: TsoaRoute.PropertySchema[] | undefined, parent = ''): any {
    if (!subSchemas) {
      throw new Error(
        'internal tsoa error: ' +
          'the metadata that was generated should have had sub schemas since it’s for a intersection, however it did not. ' +
          'Please file an issue with tsoa at https://github.com/lukeautry/tsoa/issues',
      );
    }

    const subFieldErrors: FieldErrors[] = [];
    let cleanValues = {};

    subSchemas
      .filter(subSchema => subSchema.ref)
      .forEach(subSchema => {
        const subFieldError: FieldErrors = {};
        const cleanValue = this.ValidateParam(subSchema, JSON.parse(JSON.stringify(value)), name, subFieldError, parent, { noImplicitAdditionalProperties: 'silently-remove-extras' });
        cleanValues = {
          ...cleanValues,
          ...cleanValue,
        };
        subFieldErrors.push(subFieldError);
      });

    const filtered = subFieldErrors.filter(subFieldError => Object.keys(subFieldError).length !== 0);

    if (filtered.length > 0) {
      fieldErrors[parent + name] = {
        message: `Could not match the intersection against every type. Issues: ${JSON.stringify(filtered)}`,
        value,
      };
      return;
    }

    if (this.resolveAdditionalPropSetting(swaggerConfig) === 'silently-remove-extras') {
      return cleanValues;
    }

    // Only Model definitions make sense here right now
    const refNames = subSchemas.filter(subschema => subschema.ref).map(subschema => subschema.ref) as string[];
    if (!refNames.every(refName => this.models[refName])) {
      return value;
    }

    const reportedExcess = new Set(
      refNames
        .map(refName => this.models[refName])
        .reduce((acc, subSchema) => {
          return [...acc, ...this.getExcessPropertiesFor(subSchema, Object.keys(value), swaggerConfig)];
        }, []),
    );

    if (reportedExcess.size === 0) {
      return value;
    }

    const allowedProperties = new Set(
      refNames
        .map(refName => this.models[refName])
        .reduce((acc, subSchema) => {
          return [...acc, ...this.getPropertiesFor(subSchema)];
        }, []),
    );

    const actualExcess = [...reportedExcess].filter(property => !allowedProperties.has(property));

    if (actualExcess.length > 0) {
      fieldErrors[parent + name] = {
        message: `The following properties are not allowed by any part of the intersection: ${actualExcess}`,
        value,
      };
    }

    return value;
  }

  private resolveAdditionalPropSetting(swaggerConfig: SwaggerConfigRelatedToRoutes): AdditionalPropSetting {
    if (!swaggerConfig.noImplicitAdditionalProperties) {
      return 'ignore';
    } else if (swaggerConfig.noImplicitAdditionalProperties === 'throw-on-extras' || swaggerConfig.noImplicitAdditionalProperties === true) {
      return 'throw-on-extras';
    } else if (swaggerConfig.noImplicitAdditionalProperties === 'silently-remove-extras') {
      return 'silently-remove-extras';
    } else {
      return assertNever(swaggerConfig.noImplicitAdditionalProperties);
    }
  }

  private getPropertiesFor(modelDefinition: TsoaRoute.ModelSchema) {
    return new Set(Object.keys((modelDefinition && modelDefinition.properties) || {}));
  }

  private getExcessPropertiesFor(modelDefinition: TsoaRoute.ModelSchema, properties: string[], config: SwaggerConfigRelatedToRoutes): string[] {
    if (!modelDefinition || !modelDefinition.properties) {
      return properties;
    }

    const modelProperties = new Set(Object.keys(modelDefinition.properties));

    if (modelDefinition.additionalProperties) {
      return [];
    } else if (this.resolveAdditionalPropSetting(config) === 'ignore') {
      return [];
    } else {
      return [...properties].filter(property => !modelProperties.has(property));
    }
  }

  public validateModel(input: { name: string; value: any; refName: string; fieldErrors: FieldErrors; parent?: string; minimalSwaggerConfig: SwaggerConfigRelatedToRoutes }): any {
    const { name, value, refName, fieldErrors, parent = '', minimalSwaggerConfig: swaggerConfig } = input;

    const modelDefinition = this.models[refName];

    if (modelDefinition) {
      const enums = modelDefinition.enums;
      if (enums) {
        return this.validateEnum(name, value, fieldErrors, enums, parent);
      }

      if (!(value instanceof Object)) {
        fieldErrors[parent + name] = {
          message: `invalid object`,
          value,
        };
        return;
      }

      const properties = modelDefinition.properties || {};
      const keysOnPropertiesModelDefinition = new Set(Object.keys(properties));
      const allPropertiesOnData = new Set(Object.keys(value));

      keysOnPropertiesModelDefinition.forEach((key: string) => {
        const property = properties[key];
        value[key] = this.ValidateParam(property, value[key], key, fieldErrors, parent, swaggerConfig);
      });

      const isAnExcessProperty = (objectKeyThatMightBeExcess: string) => {
        return allPropertiesOnData.has(objectKeyThatMightBeExcess) && !keysOnPropertiesModelDefinition.has(objectKeyThatMightBeExcess);
      };

      const additionalProperties = modelDefinition.additionalProperties;

      if (additionalProperties === true || isDefaultForAdditionalPropertiesAllowed(additionalProperties)) {
        // then don't validate any of the additional properties
      } else if (additionalProperties === false) {
        Object.keys(value).forEach((key: string) => {
          if (isAnExcessProperty(key)) {
            if (swaggerConfig.noImplicitAdditionalProperties === 'throw-on-extras') {
              fieldErrors[parent + '.' + key] = {
                message: `"${key}" is an excess property and therefore is not allowed`,
                value: key,
              };
            } else if (swaggerConfig.noImplicitAdditionalProperties === true) {
              warnAdditionalPropertiesDeprecation(swaggerConfig.noImplicitAdditionalProperties);
              fieldErrors[parent + '.' + key] = {
                message: `"${key}" is an excess property and therefore is not allowed`,
                value: key,
              };
            } else if (swaggerConfig.noImplicitAdditionalProperties === 'silently-remove-extras') {
              delete value[key];
            } else if (swaggerConfig.noImplicitAdditionalProperties === false) {
              warnAdditionalPropertiesDeprecation(swaggerConfig.noImplicitAdditionalProperties);
              // then it's okay to have additionalProperties
            } else if (swaggerConfig.noImplicitAdditionalProperties === undefined) {
              // then it's okay to have additionalProperties
            } else {
              assertNever(swaggerConfig.noImplicitAdditionalProperties);
            }
          }
        });
      } else {
        Object.keys(value).forEach((key: string) => {
          if (isAnExcessProperty(key)) {
            const validatedValue = this.ValidateParam(additionalProperties, value[key], key, fieldErrors, parent, swaggerConfig);
            if (validatedValue !== undefined) {
              value[key] = validatedValue;
            } else {
              fieldErrors[parent + '.' + key] = {
                message: `No matching model found in additionalProperties to validate ${key}`,
                value: key,
              };
            }
          }
        });
      }
    }

    return value;
  }
}

export interface IntegerValidator {
  isInt?: { errorMsg?: string };
  isLong?: { errorMsg?: string };
  minimum?: { value: number; errorMsg?: string };
  maximum?: { value: number; errorMsg?: string };
}

export interface FloatValidator {
  isFloat?: { errorMsg?: string };
  isDouble?: { errorMsg?: string };
  minimum?: { value: number; errorMsg?: string };
  maximum?: { value: number; errorMsg?: string };
}

export interface DateValidator {
  isDate?: { errorMsg?: string };
  minDate?: { value: string; errorMsg?: string };
  maxDate?: { value: string; errorMsg?: string };
}

export interface DateTimeValidator {
  isDateTime?: { errorMsg?: string };
  minDate?: { value: string; errorMsg?: string };
  maxDate?: { value: string; errorMsg?: string };
}

export interface StringValidator {
  isString?: { errorMsg?: string };
  minLength?: { value: number; errorMsg?: string };
  maxLength?: { value: number; errorMsg?: string };
  pattern?: { value: string; errorMsg?: string };
}

export interface BooleanValidator {
  isArray?: { errorMsg?: string };
}

export interface ArrayValidator {
  isArray?: { errorMsg?: string };
  minItems?: { value: number; errorMsg?: string };
  maxItems?: { value: number; errorMsg?: string };
  uniqueItems?: { errorMsg?: string };
}

export type Validator = IntegerValidator | FloatValidator | DateValidator | DateTimeValidator | StringValidator | BooleanValidator | ArrayValidator;

type AdditionalPropSetting = 'ignore' | 'silently-remove-extras' | 'throw-on-extras';

export interface FieldErrors {
  [name: string]: { message: string; value?: any };
}

export interface Exception extends Error {
  status: number;
}

export class ValidateError implements Exception {
  public status = 400;
  public name = 'ValidateError';

  constructor(public fields: FieldErrors, public message: string) {}
}
export * from './tsoa-route';
