import * as moment from 'moment';

let models: any = null;

export function ValidateParam(typeData: any, value: any, generatedModels: any, name = '') {
  models = generatedModels;

  if (value === undefined || value === null) {
    if (typeData.required) {
      throw new InvalidRequestException(name + ' is a required parameter.');
    } else {
      return undefined;
    }
  }

  switch (typeData.typeName) {
    case 'string':
      return validateString(value, name);
    case 'boolean':
      return validateBool(value, <any>name);
    case 'number':
      return validateNumber(value, <any>name);
    case 'array':
      return validateArray(value, typeData.arrayType, <any>name);
    case 'datetime':
      return validateDate(value, name);
    default:
      return validateModel(value, typeData.typeName);
  }
}

function validateNumber(numberValue: string, name: string): number {
  const parsedNumber = parseInt(numberValue, 10);
  if (isNaN(parsedNumber)) {
    throw new InvalidRequestException(name + ' should be a valid number.');
  }

  return parsedNumber;
}

function validateDate(dateValue: string, name: string): Date {
  const validatedDate = moment(dateValue, moment.ISO_8601, true);
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

function validateBool(boolValue: any, name: string): boolean {
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

function validateArray(array: any[], arrayType: string, arrayName: string): any[] {
  return array.map(element => ValidateParam({
    required: true,
    typeName: arrayType,
  }, element, models, undefined));
}

interface Exception extends Error {
  status: number;
}

class InvalidRequestException implements Exception {
  public status = 400;
  public name = 'Invalid Request';

  constructor(public message: string) { }
}
