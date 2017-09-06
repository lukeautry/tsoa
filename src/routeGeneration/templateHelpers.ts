import * as moment from 'moment';
import * as validator from 'validator';
import { TsoaRoute } from './tsoa-route';

let models: TsoaRoute.Models = {};

export function ValidateParam(property: TsoaRoute.PropertySchema, value: any, generatedModels: TsoaRoute.Models, name = '', fieldErrors: FieldErrors, parent = '') {
  models = generatedModels;

  if (value === undefined || value === null) {
    if (property.required) {
      let message = `'${name}' is a required`;
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
      return property.default;
    }
  }

  switch (property.dataType) {
    case 'string':
      return validateString(name, value, fieldErrors, property.validators, parent);
    case 'boolean':
      return validateBool(name, value, fieldErrors, property.validators, parent);
    case 'integer':
    case 'long':
      return validateInt(name, value, fieldErrors, property.validators, parent);
    case 'float':
    case 'double':
      return validateFloat(name, value, fieldErrors, property.validators, parent);
    case 'enum':
      return validateEnum(name, value, fieldErrors, property.enums, parent);
    case 'array':
      return validateArray(name, value, fieldErrors, property.array, property.validators, parent);
    case 'date':
      return validateDate(name, value, fieldErrors, property.validators, parent);
    case 'datetime':
      return validateDateTime(name, value, fieldErrors, property.validators, parent);
    case 'buffer':
      return validateBuffer(name, value);
    case 'any':
      return value;
    default:
      if (property.ref) {
        return validateModel(name, value, property.ref, fieldErrors, parent);
      }
      return value;
  }
}

export function validateInt(name: string, value: any, fieldErrors: FieldErrors, validators?: IntegerValidator, parent = '') {
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
  if (!validators) { return numberValue; }
  if (validators.minimum && validators.minimum.value) {
    if (validators.minimum.value > numberValue) {
      fieldErrors[parent + name] = {
        message: validators.minimum.errorMsg || `min ${validators.minimum.value}`,
        value,
      };
      return;
    }
  }
  if (validators.maximum && validators.maximum.value) {
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

export function validateFloat(name: string, value: any, fieldErrors: FieldErrors, validators?: FloatValidator, parent = '') {
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
  if (!validators) { return numberValue; }
  if (validators.minimum && validators.minimum.value) {
    if (validators.minimum.value > numberValue) {
      fieldErrors[parent + name] = {
        message: validators.minimum.errorMsg || `min ${validators.minimum.value}`,
        value,
      };
      return;
    }
  }
  if (validators.maximum && validators.maximum.value) {
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

export function validateEnum(name: string, value: any, fieldErrors: FieldErrors, members?: string[], parent = ''): any {
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

export function validateDate(name: string, value: any, fieldErrors: FieldErrors, validators?: DateValidator, parent = '') {
  const momentDate = moment(String(value), moment.ISO_8601, true);
  if (!momentDate.isValid()) {
    const message = (validators && validators.isDate && validators.isDate.errorMsg) ? validators.isDate.errorMsg : `invalid ISO 8601 date format, i.e. YYYY-MM-DD`;
    fieldErrors[parent + name] = {
      message,
      value,
    };
    return;
  }

  const dateValue = new Date(String(value));
  if (!validators) { return dateValue; }
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

export function validateDateTime(name: string, value: any, fieldErrors: FieldErrors, validators?: DateTimeValidator, parent = '') {
  const momentDateTime = moment(String(value), moment.ISO_8601, true);
  if (!momentDateTime.isValid()) {
    const message = (validators && validators.isDateTime && validators.isDateTime.errorMsg) ? validators.isDateTime.errorMsg : `invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss`;
    fieldErrors[parent + name] = {
      message,
      value,
    };
    return;
  }

  const datetimeValue = new Date(String(value));
  if (!validators) { return datetimeValue; }
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

export function validateString(name: string, value: any, fieldErrors: FieldErrors, validators?: StringValidator, parent = '') {
  if (typeof value !== 'string') {
    const message = (validators && validators.isString && validators.isString.errorMsg) ? validators.isString.errorMsg : `invalid string value`;
    fieldErrors[parent + name] = {
      message,
      value,
    };
    return;
  }

  const stringValue = String(value);
  if (!validators) { return stringValue; }
  if (validators.minLength && validators.minLength.value) {
    if (validators.minLength.value > stringValue.length) {
      fieldErrors[parent + name] = {
        message: validators.minLength.errorMsg || `minLength ${validators.minLength.value}`,
        value,
      };
      return;
    }
  }
  if (validators.maxLength && validators.maxLength.value) {
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

export function validateBool(name: string, value: any, fieldErrors: FieldErrors, validators?: BooleanValidator, parent = '') {
  if (value === undefined || value === null) {
    return false;
  }
  if (value === true || value === false) { return value; }
  if (String(value).toLowerCase() === 'true') { return true; }
  if (String(value).toLowerCase() === 'false') { return false; }

  const message = (validators && validators.isArray && validators.isArray.errorMsg) ? validators.isArray.errorMsg : `invalid boolean value`;
  fieldErrors[parent + name] = {
    message,
    value,
  };
  return;
}

export function validateArray(name: string, value: any[], fieldErrors: FieldErrors, schema?: TsoaRoute.PropertySchema, validators?: ArrayValidator, parent = '') {
  if (!schema || value === undefined || value === null) {
    const message = (validators && validators.isArray && validators.isArray.errorMsg) ? validators.isArray.errorMsg : `invalid array`;
    fieldErrors[parent + name] = {
      message,
      value,
    };
    return;
  }

  let arrayValue = [] as any[];
  if (Array.isArray(value)) {
    arrayValue = value.map((elementValue, index) => {
      return ValidateParam(schema, elementValue, models, `$${index}`, fieldErrors, name + '.');
    });
  } else {
    arrayValue = [
      ValidateParam(schema, value, models, '$0', fieldErrors, name + '.'),
    ];
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

function validateBuffer(name: string, value: string) {
  return new Buffer(value);
}

function validateModel(name: string, value: any, refName: string, fieldErrors: FieldErrors, parent = ''): any {
  const modelDefinition = models[refName];

  if (modelDefinition) {
    const properties = modelDefinition.properties;
    if (properties) {
      Object.keys(properties).forEach((key: string) => {
        const property = properties[key];
        value[key] = ValidateParam(property, value[key], models, key, fieldErrors, parent);
      });
    }

    const additionalProperties = modelDefinition.additionalProperties;
    if (additionalProperties) {
      Object.keys(value).forEach((key: string) => {
        const validatedValue = ValidateParam(additionalProperties, value[key], models, key, fieldErrors, parent);
        if (validatedValue) {
          value[key] = validatedValue;
        } else {
          fieldErrors[parent + '.' + key] = {
            message: `No matching model found in additionalProperties to validate ${key}`,
            value: key,
          };
        }
      });
    }

    const enums = modelDefinition.enums;
    if (enums) {
      return validateEnum(name, value, fieldErrors, enums, parent);
    }
  }

  return value;
}

export interface IntegerValidator {
  isInt?: { errorMsg?: string };
  isLong?: { errorMsg?: string };
  minimum?: { value: number, errorMsg?: string };
  maximum?: { value: number, errorMsg?: string };
}

export interface FloatValidator {
  isFloat?: { errorMsg?: string };
  isDouble?: { errorMsg?: string };
  minimum?: { value: number, errorMsg?: string };
  maximum?: { value: number, errorMsg?: string };
}

export interface DateValidator {
  isDate?: { errorMsg?: string };
  minDate?: { value: string, errorMsg?: string };
  maxDate?: { value: string, errorMsg?: string };
}

export interface DateTimeValidator {
  isDateTime?: { errorMsg?: string };
  minDate?: { value: string, errorMsg?: string };
  maxDate?: { value: string, errorMsg?: string };
}

export interface StringValidator {
  isString?: { errorMsg?: string };
  minLength?: { value: number, errorMsg?: string };
  maxLength?: { value: number, errorMsg?: string };
  pattern?: { value: string, errorMsg?: string };
}

export interface BooleanValidator {
  isArray?: { errorMsg?: string };
}

export interface ArrayValidator {
  isArray?: { errorMsg?: string };
  minItems?: { value: number; errorMsg?: string; };
  maxItems?: { value: number; errorMsg?: string; };
  uniqueItems?: { errorMsg?: string; };
}

export type Validator = IntegerValidator
  | FloatValidator
  | DateValidator
  | DateTimeValidator
  | StringValidator
  | BooleanValidator
  | ArrayValidator;

export interface FieldErrors {
  [name: string]: { message: string, value?: any };
}

export interface Exception extends Error {
  status: number;
}

export class ValidateError implements Exception {
  public status = 400;
  public name = 'ValidateError';

  constructor(public fields: FieldErrors, public message: string) { }
}
export * from './tsoa-route';
