import * as moment from 'moment';
import * as validator from 'validator';

let models: any = null;

export function ValidateParam(schema: any, value: any, generatedModels: any, name = '', fieldErrors: FieldErrors, parent = '') {
  models = generatedModels;

  if (value === undefined || value === null) {
    if (schema.required) {
      let message = `'${name}' is a required ${schema.in} parameter.`;
      if (schema.validators) {
        Object.keys(schema.validators).forEach((key: string) => {
          if (key.startsWith('is')) {
            message = schema.validators[key].errorMsg;
          }
        });
      }
      fieldErrors[parent + name] = {
        message,
        value
      };
      return;
    } else {
      return;
    }
  }

  switch (schema.typeName) {
    case 'string':
      return validateString(name, value, fieldErrors, schema.validators);
    case 'boolean':
      return validateBool(name, value, fieldErrors);
    case 'integer':
    case 'long':
      return validateInt(name, value, fieldErrors, schema.validators);
    case 'float':
    case 'double':
      return validateFloat(name, value, fieldErrors, schema.validators);
    case 'enum':
      return validateEnum(name, value, fieldErrors, schema.enumMembers);
    case 'array':
      return validateArray(name, value, fieldErrors, schema.array, schema.validators);
    case 'date':
      return validateDate(name, value, fieldErrors, schema.validators);
    case 'datetime':
      return validateDateTime(name, value, fieldErrors, schema.validators);
    case 'buffer':
      return validateBuffer(name, value);
    default:
      return validateModel(schema.typeName, value, fieldErrors, name + '.');
  }
}

function validateInt(name: string, numberValue: string, fieldErrors: FieldErrors, validators?: any, parent = '') {
  if (!validator.isInt(numberValue + '')) {
    let message = 'Invalid integer number.';
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
      value: numberValue
    };
    return;
  }

  const value = validator.toInt(numberValue + '', 10);
  if (!validators) { return value; }
  if (validators.minimum && validators.minimum.value) {
    if (validators.minimum.value > value) {
      fieldErrors[parent + name] = {
        message: validators.minimum.errorMsg || `min ${validators.minimum.value}`,
        value,
      };
      return;
    }
  }
  if (validators.maximum && validators.maximum.value) {
    if (validators.maximum.value < value) {
      fieldErrors[parent + name] = {
        message: validators.maximum.errorMsg || `max ${validators.maximum.value}`,
        value,
      };
      return;
    }
  }
  return value;
}

function validateFloat(name: string, numberValue: string, fieldErrors: FieldErrors, validators?: any, parent = '') {
  if (!validator.isFloat(numberValue + '')) {
    let message = 'Invalid float number.';
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
      value: numberValue
    };
    return;
  }

  const value = validator.toFloat(numberValue + '');
  if (!validators) { return value; }
  if (validators.minimum && validators.minimum.value) {
    if (validators.minimum.value > value) {
      fieldErrors[parent + name] = {
        message: validators.minimum.errorMsg || `min ${validators.minimum.value}`,
        value,
      };
      return;
    }
  }
  if (validators.maximum && validators.maximum.value) {
    if (validators.maximum.value < value) {
      fieldErrors[parent + name] = {
        message: validators.maximum.errorMsg || `max ${validators.maximum.value}`,
        value,
      };
      return;
    }
  }
  return value;
}

function validateEnum(name: string, enumValue: string, fieldErrors: FieldErrors, members?: string[], parent = ''): any {
  if (!members) {
    fieldErrors[parent + name] = {
      message: `${name} no member.`,
      value: enumValue
    };
    return;
  }
  const existValue = members.filter(m => m === enumValue);
  if (!existValue || !enumValue.length || !existValue.length) {
    fieldErrors[parent + name] = {
      message: name + ' should be one of the following; ' + members.join(', '),
      value: enumValue
    };
    return;
  }
  return existValue[0];
}

function validateDate(name: string, dateValue: string, fieldErrors: FieldErrors, validators?: any, parent = '') {
  const momentDate = moment(dateValue, 'YYYY-MM-DD');
  if (!momentDate.isValid()) {
    const message = (validators && validators.isDate && validators.isDate.errorMsg) ? validators.isDate.errorMsg : `Invalid ISO 8601 date format, i.e. YYYY-MM-DD`;
    fieldErrors[parent + name] = {
      message,
      value: dateValue
    };
    return;
  }

  const value = new Date(dateValue);
  if (!validators) { return value; }
  if (validators.minDate && validators.minDate.value) {
    const minDate = new Date(validators.minDate.value);
    if (minDate.getTime() > value.getTime()) {
      fieldErrors[parent + name] = {
        message: validators.minDate.errorMsg || `minDate ${validators.minDate.value}`,
        value: dateValue,
      };
      return;
    }
  }
  if (validators.maxDate && validators.maxDate.value) {
    const maxDate = new Date(validators.maxDate.value);
    if (maxDate.getTime() < value.getTime()) {
      fieldErrors[parent + name] = {
        message: validators.maxDate.errorMsg || `maxDate ${validators.maxDate.value}`,
        value: dateValue,
      };
      return;
    }
  }
  return value;
}

function validateDateTime(name: string, datetimeValue: string, fieldErrors: FieldErrors, validators?: any, parent = '') {
  const momentDateTime = moment(datetimeValue, moment.ISO_8601);
  if (!momentDateTime.isValid()) {
    const message = (validators && validators.isDateTime && validators.isDateTime.errorMsg) ? validators.isDateTime.errorMsg : `Invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss`;
    fieldErrors[parent + name] = {
      message,
      value: datetimeValue
    };
    return;
  }

  const value = new Date(datetimeValue);
  if (!validators) { return value; }
  if (validators.minDate && validators.minDate.value) {
    const minDate = new Date(validators.minDate.value);
    if (minDate.getTime() > value.getTime()) {
      fieldErrors[parent + name] = {
        message: validators.minDate.errorMsg || `minDate ${validators.minDate.value}`,
        value: datetimeValue,
      };
      return;
    }
  }
  if (validators.maxDate && validators.maxDate.value) {
    const maxDate = new Date(validators.maxDate.value);
    if (maxDate.getTime() < value.getTime()) {
      fieldErrors[parent + name] = {
        message: validators.maxDate.errorMsg || `maxDate ${validators.maxDate.value}`,
        value: datetimeValue,
      };
      return;
    }
  }
  return value;
}

function validateString(name: string, stringValue: string, fieldErrors: FieldErrors, validators?: any, parent = '') {
  if (typeof stringValue !== 'string') {
    const message = (validators && validators.isString && validators.isString.errorMsg) ? validators.isString.errorMsg : `Invalid string value.`;
    fieldErrors[parent + name] = {
      message,
      value: stringValue
    };
    return;
  }

  const value = stringValue.toString();
  if (!validators) { return value; }
  if (validators.minLength && validators.minLength.value) {
    if (validators.minLength.value > value.length) {
      fieldErrors[parent + name] = {
        message: validators.minLength.errorMsg || `minLength ${validators.minLength.value}`,
        value: stringValue,
      };
      return;
    }
  }
  if (validators.maxLength && validators.maxLength.value) {
    if (validators.maxLength.value < value.length) {
      fieldErrors[parent + name] = {
        message: validators.maxLength.errorMsg || `maxLength ${validators.maxLength.value}`,
        value: stringValue,
      };
      return;
    }
  }
  if (validators.pattern && validators.pattern.value) {
    if (!validator.matches(value, validators.pattern.value)) {
      fieldErrors[parent + name] = {
        message: validators.pattern.errorMsg || `Not match in '${validators.pattern.value}'.`,
        value: stringValue,
      };
      return;
    }
  }
  return value;
}

function validateBool(name: string, boolValue: any, fieldErrors: FieldErrors, validators?: any, parent = '') {
  if (boolValue === true || boolValue === false) { return boolValue; }
  if (boolValue.toLowerCase() === 'true') { return true; }
  if (boolValue.toLowerCase() === 'false') { return false; }

  const message = (validators && validators.isArray && validators.isArray.errorMsg) ? validators.isArray.errorMsg : `Invalid boolean value.`;
  fieldErrors[parent + name] = {
    message,
    value: boolValue
  };
  return;
}

function validateModel(typeName: string, modelValue: any, fieldErrors: FieldErrors, parent = ''): any {
  const modelDefinition = models[typeName];

  if (modelDefinition) {
    if (modelDefinition.properties) {
      Object.keys(modelDefinition.properties).forEach((key: string) => {
        const property = modelDefinition.properties[key];
        modelValue[key] = ValidateParam(property, modelValue[key], models, key, fieldErrors, parent);
      });
    }
    if (modelDefinition.additionalProperties) {
      Object.keys(modelValue).forEach((key: string) => {
        const validatedValue = ValidateParam(modelDefinition.additionalProperties, modelValue[key], models, key, fieldErrors, parent);
        if (validatedValue) {
          modelValue[key] = validatedValue;
        } else {
          fieldErrors[parent + typeName + '.' + key] = {
            message: `No matching model found in additionalProperties to validate ${key}`,
            value: key
          };
        }
      });
    }
  }

  return modelValue;
}

function validateArray(name: string, arrayValue: any[], fieldErrors: FieldErrors, schema?: any, validators?: any, parent = '') {
  if (!schema || !Array.isArray(arrayValue)) {
    const message = (validators && validators.isArray && validators.isArray.errorMsg) ? validators.isArray.errorMsg : `Invalid array.`;
    fieldErrors[parent + name] = {
      message,
      value: arrayValue
    };
    return;
  }

  const value: any[] = arrayValue.map(v => {
    return ValidateParam(schema, v, models, undefined, fieldErrors);
  });
  if (!validators) { return value; };
  if (validators.minItems && validators.minItems.value) {
    if (validators.minItems.value > value.length) {
      fieldErrors[parent + name] = {
        message: validators.minItems.errorMsg || `minItems ${validators.minItems.value}`,
        value
      };
      return;
    }
  }
  if (validators.maxItems && validators.maxItems.value) {
    if (validators.maxItems.value < value.length) {
      fieldErrors[parent + name] = {
        message: validators.maxItems.errorMsg || `maxItems ${validators.maxItems.value}`,
        value
      };
      return;
    }
  }
  if (validators.uniqueItems) {
    const unique = value.some((elem, index, arr) => {
      const indexOf = arr.indexOf(elem);
      return indexOf > -1 && indexOf !== index;
    });
    if (unique) {
      fieldErrors[parent + name] = {
        message: validators.uniqueItems.errorMsg || `Required unique array.`,
        value
      };
      return;
    }
  }
  return value;
}

function validateBuffer(name: string, value: string) {
  return new Buffer(value);
}

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
