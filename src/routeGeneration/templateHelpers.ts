import * as moment from 'moment';
import * as validator from 'validator';

let models: any = null;

export function ValidateParam(schema: any, value: any, generatedModels: any, name = '') {
  models = generatedModels;

  if (value === undefined || value === null) {
    if (schema.required) {
      throw new InvalidRequestException(`'${name}' is a required ${schema.in} parameter.`);
    } else {
      return undefined;
    }
  }

  switch (schema.typeName) {
    case 'string':
      return validateString(value, name);
    case 'boolean':
      return validateBool(value, name);
    case 'integer':
    case 'long':
      return validateInt(value, name);
    case 'float':
    case 'double':
      return validateFloat(value, name);
    case 'enum':
      return validateEnum(value, name, schema.enumMembers);
    case 'array':
      return validateArray(value, name, schema.array);
    case 'date':
      return validateDate(value, name);
    case 'datetime':
      return validateDateTime(value, name);
    case 'buffer':
      return validateBuffer(value, name);
    default:
      return validateModel(value, schema.typeName);
  }
}

function validateInt(numberValue: string, name: string): number {
  if (!validator.isInt(numberValue + '')) {
    throw new InvalidRequestException(name + ' should be a valid integer.');
  }
  return validator.toInt(numberValue + '', 10);
}

function validateFloat(numberValue: string, name: string): number {
  if (!validator.isFloat(numberValue + '')) {
    throw new InvalidRequestException(name + ' should be a valid float.');
  }

  return validator.toFloat(numberValue + '');
}

function validateEnum(enumValue: string, name: string, members?: string[]): any {
  if (!members) {
    throw new InvalidRequestException(name + ' no member.');
  }
  const existValue = members.filter(m => m === enumValue);
  if (!existValue || !enumValue.length) {
    throw new InvalidRequestException(name + ' ' + members.join(','));
  }
  return existValue[0];
}

function validateDate(dateValue: string, name: string): Date {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateValue.match(regEx)) {
    throw new InvalidRequestException(name + ' should be a valid date, i.e. YYYY-MM-DD');
  }
  return new Date(dateValue);
}

function validateDateTime(datetimeValue: string, name: string): Date {
  const validatedDate = moment(datetimeValue, moment.ISO_8601, true);
  if (!validatedDate.isValid()) {
    throw new InvalidRequestException(name + ' should be a valid ISO 8601 date, i.e. YYYY-MM-DDTHH:mm:ss');
  }

  return validatedDate.toDate();
}

function validateString(stringValue: string, name: string) {
  if (typeof stringValue !== 'string') {
    throw new InvalidRequestException(name + ' should be a valid string.');
  }

  return stringValue.toString();
}

function validateBool(boolValue: any, typeName: string): boolean {
  if (boolValue === true || boolValue === false) { return boolValue; }
  if (boolValue.toLowerCase() === 'true') { return true; }
  if (boolValue.toLowerCase() === 'false') { return false; }

  throw new InvalidRequestException(name + ' should be valid boolean value.');
}

function validateModel(modelValue: any, typeName: string): any {
  const modelDefinition = models[typeName];

  if (modelDefinition) {
    Object.keys(modelDefinition).forEach((key: string) => {
      const property = modelDefinition[key];
      modelValue[key] = ValidateParam(property, modelValue[key], models, key);
    });
  }

  return modelValue;
}

function validateArray(arrayValue: any[], name: string, schema?: any): any[] {
  if (!schema) {
    throw new InvalidRequestException(name + ' array invalid.');
  }
  return arrayValue.map(value => {
    return ValidateParam(schema, value, models, undefined);
  });
}

function validateBuffer(value: string, name: string) {
  return new Buffer(value);
}

interface Exception extends Error {
  status: number;
}

class InvalidRequestException implements Exception {
  public status = 400;
  public name = 'Invalid Request';

  constructor(public message: string) { }
}
