import validator from 'validator';
import { assertNever } from '../utils/assertNever';
import { AdditionalProps } from './additionalProps';
import { TsoaRoute, isDefaultForAdditionalPropertiesAllowed } from './tsoa-route';
import { Tsoa } from '../metadataGeneration/tsoa';
import ValidatorKey = Tsoa.ValidatorKey;

// for backwards compatibility with custom templates
export function ValidateParam(
  property: TsoaRoute.PropertySchema,
  value: any,
  generatedModels: TsoaRoute.Models,
  name = '',
  fieldErrors: FieldErrors,
  isBodyParam: boolean,
  parent = '',
  config: AdditionalProps,
) {
  return new ValidationService(generatedModels, config).ValidateParam(property, value, name, fieldErrors, isBodyParam, parent);
}

export class ValidationService {
  private validationStack: Set<string> = new Set();

  constructor(
    private readonly models: TsoaRoute.Models,
    private readonly config: AdditionalProps,
  ) {}

  public ValidateParam(property: TsoaRoute.PropertySchema, rawValue: any, name = '', fieldErrors: FieldErrors, isBodyParam: boolean, parent = '') {
    let value = rawValue;
    // If undefined is allowed type, we can move to value validation
    if (value === undefined && property.dataType !== 'undefined') {
      // If there's either default value or datatype is union with undefined valid, we can just set it and move to validation
      if (property.default !== undefined || (property.dataType === 'union' && property.subSchemas?.some(p => p.dataType === 'undefined'))) {
        value = property.default;
      } else if (property.required) {
        // If value can be typed as undefined, there's no need to check mandatoriness here.
        let message = `'${name}' is required`;
        if (property.validators) {
          const validators = property.validators;
          Object.keys(validators).forEach((key: string) => {
            const errorMsg = validators[key as ValidatorKey]?.errorMsg;
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
        return value;
      }
    }

    switch (property.dataType) {
      case 'string':
        return this.validateString(name, value, fieldErrors, property.validators as StringValidator, parent);
      case 'boolean':
        return this.validateBool(name, value, fieldErrors, isBodyParam, property.validators as BooleanValidator, parent);
      case 'integer':
      case 'long':
        return this.validateInt(name, value, fieldErrors, isBodyParam, property.validators as IntegerValidator, parent);
      case 'float':
      case 'double':
        return this.validateFloat(name, value, fieldErrors, isBodyParam, property.validators as FloatValidator, parent);
      case 'enum':
        return this.validateEnum(name, value, fieldErrors, property.enums, parent);
      case 'array':
        return this.validateArray(name, value, fieldErrors, isBodyParam, property.array, property.validators as ArrayValidator, parent);
      case 'date':
        return this.validateDate(name, value, fieldErrors, isBodyParam, property.validators as DateValidator, parent);
      case 'datetime':
        return this.validateDateTime(name, value, fieldErrors, isBodyParam, property.validators as DateTimeValidator, parent);
      case 'buffer':
        return this.validateBuffer(name, value);
      case 'union':
        return this.validateUnion(name, value, fieldErrors, isBodyParam, property, parent);
      case 'intersection':
        return this.validateIntersection(name, value, fieldErrors, isBodyParam, property.subSchemas, parent);
      case 'undefined':
        return this.validateUndefined(name, value, fieldErrors, parent);
      case 'any':
        return value;
      case 'nestedObjectLiteral':
        return this.validateNestedObjectLiteral(name, value, fieldErrors, isBodyParam, property.nestedProperties, property.additionalProperties, parent);
      default:
        if (property.ref) {
          // Detect circular references to prevent stack overflow
          const refPath = `${parent}${name}:${property.ref}`;
          if (this.validationStack.has(refPath)) {
            return value;
          }

          this.validationStack.add(refPath);
          try {
            return this.validateModel({ name, value, modelDefinition: this.models[property.ref], fieldErrors, isBodyParam, parent });
          } finally {
            this.validationStack.delete(refPath);
          }
        }
        return value;
    }
  }

  public hasCorrectJsType(value: any, type: 'object' | 'boolean' | 'number' | 'string', isBodyParam: boolean) {
    return !isBodyParam || this.config.bodyCoercion || typeof value === type;
  }

  public validateNestedObjectLiteral(
    name: string,
    value: any,
    fieldErrors: FieldErrors,
    isBodyParam: boolean,
    nestedProperties: { [name: string]: TsoaRoute.PropertySchema } | undefined,
    additionalProperties: TsoaRoute.PropertySchema | boolean | undefined,
    parent: string,
  ) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      fieldErrors[parent + name] = {
        message: `invalid object`,
        value,
      };
      return;
    }

    const previousErrors = Object.keys(fieldErrors).length;

    if (!nestedProperties) {
      throw new Error(
        'internal tsoa error: ' +
          'the metadata that was generated should have had nested property schemas since it’s for a nested object,' +
          'however it did not. ' +
          'Please file an issue with tsoa at https://github.com/lukeautry/tsoa/issues',
      );
    }

    const propHandling = this.config.noImplicitAdditionalProperties;
    if (propHandling !== 'ignore') {
      const excessProps = this.getExcessPropertiesFor({ dataType: 'refObject', properties: nestedProperties, additionalProperties }, Object.keys(value));
      if (excessProps.length > 0) {
        if (propHandling === 'silently-remove-extras') {
          excessProps.forEach(excessProp => {
            delete value[excessProp];
          });
        }
        if (propHandling === 'throw-on-extras') {
          fieldErrors[parent + name] = {
            message: `"${excessProps.join(',')}" is an excess property and therefore is not allowed`,
            value: excessProps.reduce((acc, propName) => ({ [propName]: value[propName], ...acc }), {}),
          };
        }
      }
    }

    Object.keys(nestedProperties).forEach(key => {
      const validatedProp = this.ValidateParam(nestedProperties[key], value[key], key, fieldErrors, isBodyParam, parent + name + '.');

      // Add value from validator if it's not undefined or if value is required and unfedined is valid type
      if (validatedProp !== undefined || (nestedProperties[key].dataType === 'undefined' && nestedProperties[key].required)) {
        value[key] = validatedProp;
      }
    });

    if (typeof additionalProperties === 'object' && typeof value === 'object') {
      const keys = Object.keys(value).filter(key => typeof nestedProperties[key] === 'undefined');
      keys.forEach(key => {
        const validatedProp = this.ValidateParam(additionalProperties, value[key], key, fieldErrors, isBodyParam, parent + name + '.');
        // Add value from validator if it's not undefined or if value is required and unfedined is valid type
        if (validatedProp !== undefined || (additionalProperties.dataType === 'undefined' && additionalProperties.required)) {
          value[key] = validatedProp;
        }
      });
    }

    if (Object.keys(fieldErrors).length > previousErrors) {
      return;
    }

    return value;
  }

  public validateInt(name: string, value: any, fieldErrors: FieldErrors, isBodyParam: boolean, validators?: IntegerValidator, parent = '') {
    if (!this.hasCorrectJsType(value, 'number', isBodyParam) || !validator.isInt(String(value))) {
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

  public validateFloat(name: string, value: any, fieldErrors: FieldErrors, isBodyParam: boolean, validators?: FloatValidator, parent = '') {
    if (!this.hasCorrectJsType(value, 'number', isBodyParam) || !validator.isFloat(String(value))) {
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

  public validateEnum(name: string, value: unknown, fieldErrors: FieldErrors, members?: Array<string | number | boolean | null>, parent = ''): unknown {
    if (!members || members.length === 0) {
      fieldErrors[parent + name] = {
        message: 'no member',
        value,
      };
      return;
    }

    const enumMatchIndex = members.map(member => String(member)).findIndex(member => validator.equals(member, String(value)));

    if (enumMatchIndex === -1) {
      const membersInQuotes = members.map(member => (typeof member === 'string' ? `'${member}'` : String(member)));
      fieldErrors[parent + name] = {
        message: `should be one of the following; [${membersInQuotes.join(',')}]`,
        value,
      };
      return;
    }

    return members[enumMatchIndex];
  }

  public validateDate(name: string, value: any, fieldErrors: FieldErrors, isBodyParam: boolean, validators?: DateValidator, parent = '') {
    if (!this.hasCorrectJsType(value, 'string', isBodyParam) || !validator.isISO8601(String(value), { strict: true })) {
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

  public validateDateTime(name: string, value: any, fieldErrors: FieldErrors, isBodyParam: boolean, validators?: DateTimeValidator, parent = '') {
    if (!this.hasCorrectJsType(value, 'string', isBodyParam) || !validator.isISO8601(String(value), { strict: true })) {
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

  public validateBool(name: string, value: any, fieldErrors: FieldErrors, isBodyParam: boolean, validators?: BooleanValidator, parent = '') {
    if (value === true || value === false) {
      return value;
    }

    if (!isBodyParam || this.config.bodyCoercion === true) {
      if (value === undefined || value === null) {
        return false;
      }
      if (String(value).toLowerCase() === 'true') {
        return true;
      }
      if (String(value).toLowerCase() === 'false') {
        return false;
      }
    }

    const message = validators && validators.isBoolean && validators.isBoolean.errorMsg ? validators.isBoolean.errorMsg : `invalid boolean value`;
    fieldErrors[parent + name] = {
      message,
      value,
    };
    return;
  }

  public validateUndefined(name: string, value: any, fieldErrors: FieldErrors, parent = '') {
    if (value === undefined) {
      return undefined;
    }

    const message = 'invalid undefined value';
    fieldErrors[parent + name] = {
      message,
      value,
    };
    return;
  }

  public validateArray(name: string, value: any[], fieldErrors: FieldErrors, isBodyParam: boolean, schema?: TsoaRoute.PropertySchema, validators?: ArrayValidator, parent = '') {
    if ((isBodyParam && this.config.bodyCoercion === false && !Array.isArray(value)) || !schema || value === undefined) {
      const message = validators && validators.isArray && validators.isArray.errorMsg ? validators.isArray.errorMsg : `invalid array`;
      fieldErrors[parent + name] = {
        message,
        value,
      };
      return;
    }

    let arrayValue = [] as any[];
    const previousErrors = Object.keys(fieldErrors).length;
    if (Array.isArray(value)) {
      arrayValue = value.map((elementValue, index) => {
        return this.ValidateParam(schema, elementValue, `$${index}`, fieldErrors, isBodyParam, name + '.');
      });
    } else {
      arrayValue = [this.ValidateParam(schema, value, '$0', fieldErrors, isBodyParam, name + '.')];
    }

    if (Object.keys(fieldErrors).length > previousErrors) {
      return;
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

  public validateBuffer(_name: string, value: string) {
    return Buffer.from(value);
  }

  public validateUnion(name: string, value: any, fieldErrors: FieldErrors, isBodyParam: boolean, property: TsoaRoute.PropertySchema, parent = ''): any {
    if (!property.subSchemas) {
      throw new Error(
        'internal tsoa error: ' +
          'the metadata that was generated should have had sub schemas since it’s for a union, however it did not. ' +
          'Please file an issue with tsoa at https://github.com/lukeautry/tsoa/issues',
      );
    }

    const subFieldErrors: FieldErrors[] = [];

    for (const subSchema of property.subSchemas) {
      const subFieldError: FieldErrors = {};

      // Clean value if it's not undefined or use undefined directly if it's undefined.
      // Value can be undefined if undefined is allowed datatype of the union
      const validateableValue = value !== undefined ? this.deepClone(value) : value;
      const cleanValue = this.ValidateParam({ ...subSchema, validators: { ...property.validators, ...subSchema.validators } }, validateableValue, name, subFieldError, isBodyParam, parent);
      subFieldErrors.push(subFieldError);

      if (Object.keys(subFieldError).length === 0) {
        return cleanValue;
      }
    }

    this.addSummarizedError(fieldErrors, parent + name, 'Could not match the union against any of the items. Issues: ', subFieldErrors, value);
    return;
  }

  public validateIntersection(name: string, value: any, fieldErrors: FieldErrors, isBodyParam: boolean, subSchemas: TsoaRoute.PropertySchema[] | undefined, parent = ''): any {
    if (!subSchemas) {
      throw new Error(
        'internal tsoa error: ' +
          'the metadata that was generated should have had sub schemas since it’s for a intersection, however it did not. ' +
          'Please file an issue with tsoa at https://github.com/lukeautry/tsoa/issues',
      );
    }

    const subFieldErrors: FieldErrors[] = [];
    let cleanValues = {};

    subSchemas.forEach(subSchema => {
      const subFieldError: FieldErrors = {};
      const cleanValue = this.createChildValidationService({
        noImplicitAdditionalProperties: 'silently-remove-extras',
      }).ValidateParam(subSchema, this.deepClone(value), name, subFieldError, isBodyParam, parent);
      cleanValues = {
        ...cleanValues,
        ...cleanValue,
      };
      subFieldErrors.push(subFieldError);
    });

    const filtered = subFieldErrors.filter(subFieldError => Object.keys(subFieldError).length !== 0);

    if (filtered.length > 0) {
      this.addSummarizedError(fieldErrors, parent + name, 'Could not match the intersection against every type. Issues: ', filtered, value);
      return;
    }

    const schemas = this.selfIntersectionCombinations(subSchemas.map(subSchema => this.toModelLike(subSchema)));

    const getRequiredPropError = (schema: TsoaRoute.ModelSchema) => {
      const requiredPropError = {};
      this.createChildValidationService({
        noImplicitAdditionalProperties: 'ignore',
      }).validateModel({
        name,
        value: this.deepClone(value),
        modelDefinition: schema,
        fieldErrors: requiredPropError,
        isBodyParam,
      });
      return requiredPropError;
    };

    const schemasWithRequiredProps = schemas.filter(schema => Object.keys(getRequiredPropError(schema)).length === 0);

    if (this.config.noImplicitAdditionalProperties === 'ignore') {
      return { ...value, ...cleanValues };
    }

    if (this.config.noImplicitAdditionalProperties === 'silently-remove-extras') {
      if (schemasWithRequiredProps.length > 0) {
        return cleanValues;
      } else {
        fieldErrors[parent + name] = {
          message: `Could not match intersection against any of the possible combinations: ${JSON.stringify(schemas.map(s => Object.keys(s.properties)))}`,
          value,
        };
        return;
      }
    }

    if (schemasWithRequiredProps.length > 0 && schemasWithRequiredProps.some(schema => this.getExcessPropertiesFor(schema, Object.keys(value)).length === 0)) {
      return cleanValues;
    } else {
      fieldErrors[parent + name] = {
        message: `Could not match intersection against any of the possible combinations: ${JSON.stringify(schemas.map(s => Object.keys(s.properties)))}`,
        value,
      };
      return;
    }
  }

  private toModelLike(schema: TsoaRoute.PropertySchema): TsoaRoute.RefObjectModelSchema[] {
    if (schema.ref) {
      const model = this.models[schema.ref];
      if (model.dataType === 'refObject') {
        return [model];
      } else if (model.dataType === 'refAlias') {
        return [...this.toModelLike(model.type)];
      } else if (model.dataType === 'refEnum') {
        throw new Error(`Can't transform an enum into a model like structure because it does not have properties.`);
      } else {
        return assertNever(model);
      }
    } else if (schema.nestedProperties) {
      return [{ dataType: 'refObject', properties: schema.nestedProperties, additionalProperties: schema.additionalProperties }];
    } else if (schema.subSchemas && schema.dataType === 'intersection') {
      const modelss: TsoaRoute.RefObjectModelSchema[][] = schema.subSchemas.map(subSchema => this.toModelLike(subSchema));

      return this.selfIntersectionCombinations(modelss);
    } else if (schema.subSchemas && schema.dataType === 'union') {
      const modelss: TsoaRoute.RefObjectModelSchema[][] = schema.subSchemas.map(subSchema => this.toModelLike(subSchema));
      return modelss.reduce((acc, models) => [...acc, ...models], []);
    } else {
      // There are no properties to check for excess here.
      return [{ dataType: 'refObject', properties: {}, additionalProperties: false }];
    }
  }

  /**
   * combine all schemas once, ignoring order ie
   * input: [[value1], [value2]] should be [[value1, value2]]
   * not [[value1, value2],[value2, value1]]
   * and
   * input: [[value1, value2], [value3, value4], [value5, value6]] should be [
   *   [value1, value3, value5],
   *   [value1, value3, value6],
   *   [value1, value4, value5],
   *   [value1, value4, value6],
   *   [value2, value3, value5],
   *   [value2, value3, value6],
   *   [value2, value4, value5],
   *   [value2, value4, value6],
   * ]
   * @param modelSchemass
   */
  private selfIntersectionCombinations(modelSchemass: TsoaRoute.RefObjectModelSchema[][]): TsoaRoute.RefObjectModelSchema[] {
    const res: TsoaRoute.RefObjectModelSchema[] = [];
    // Picks one schema from each sub-array
    const combinations = this.getAllCombinations(modelSchemass);

    for (const combination of combinations) {
      // Combine all schemas of this combination
      let currentCollector = { ...combination[0] };
      for (let subSchemaIdx = 1; subSchemaIdx < combination.length; subSchemaIdx++) {
        currentCollector = { ...this.combineProperties(currentCollector, combination[subSchemaIdx]) };
      }
      res.push(currentCollector);
    }
    return res;
  }

  private getAllCombinations<T>(arrays: T[][]): T[][] {
    function combine(current: T[], index: number) {
      if (index === arrays.length) {
        result.push(current.slice());
        return;
      }

      for (let i = 0; i < arrays[index].length; i++) {
        current.push(arrays[index][i]);
        combine(current, index + 1);
        current.pop();
      }
    }

    const result: T[][] = [];
    combine([], 0);
    return result;
  }

  private combineProperties(a: TsoaRoute.RefObjectModelSchema, b: TsoaRoute.RefObjectModelSchema): TsoaRoute.RefObjectModelSchema {
    return { dataType: 'refObject', properties: { ...a.properties, ...b.properties }, additionalProperties: a.additionalProperties || b.additionalProperties || false };
  }

  private getExcessPropertiesFor(modelDefinition: TsoaRoute.RefObjectModelSchema, properties: string[]): string[] {
    const modelProperties = new Set(Object.keys(modelDefinition.properties));

    if (modelDefinition.additionalProperties) {
      return [];
    } else if (this.config.noImplicitAdditionalProperties === 'ignore') {
      return [];
    } else {
      return [...properties].filter(property => !modelProperties.has(property));
    }
  }

  public validateModel(input: { name: string; value: any; modelDefinition: TsoaRoute.ModelSchema; fieldErrors: FieldErrors; isBodyParam: boolean; parent?: string }): any {
    const { name, value, modelDefinition, fieldErrors, isBodyParam, parent = '' } = input;
    const previousErrors = Object.keys(fieldErrors).length;

    if (modelDefinition) {
      if (modelDefinition.dataType === 'refEnum') {
        return this.validateEnum(name, value, fieldErrors, modelDefinition.enums, parent);
      }

      if (modelDefinition.dataType === 'refAlias') {
        return this.ValidateParam(modelDefinition.type, value, name, fieldErrors, isBodyParam, parent);
      }

      const fieldPath = parent + name;

      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        fieldErrors[fieldPath] = {
          message: `invalid object`,
          value,
        };
        return;
      }

      const properties = modelDefinition.properties || {};
      const keysOnPropertiesModelDefinition = new Set(Object.keys(properties));
      const allPropertiesOnData = new Set(Object.keys(value));

      Object.entries(properties).forEach(([key, property]) => {
        const validatedParam = this.ValidateParam(property, value[key], key, fieldErrors, isBodyParam, fieldPath + '.');

        // Add value from validator if it's not undefined or if value is required and unfedined is valid type
        if (validatedParam !== undefined || (property.dataType === 'undefined' && property.required)) {
          value[key] = validatedParam;
        }
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
            if (this.config.noImplicitAdditionalProperties === 'throw-on-extras') {
              fieldErrors[`${fieldPath}.${key}`] = {
                message: `"${key}" is an excess property and therefore is not allowed`,
                value: key,
              };
            } else if (this.config.noImplicitAdditionalProperties === 'silently-remove-extras') {
              delete value[key];
            } else if (this.config.noImplicitAdditionalProperties === 'ignore') {
              // then it's okay to have additionalProperties
            } else {
              assertNever(this.config.noImplicitAdditionalProperties);
            }
          }
        });
      } else {
        Object.keys(value).forEach((key: string) => {
          if (isAnExcessProperty(key)) {
            const validatedValue = this.ValidateParam(additionalProperties, value[key], key, fieldErrors, isBodyParam, fieldPath + '.');
            // Add value from validator if it's not undefined or if value is required and unfedined is valid type
            if (validatedValue !== undefined || (additionalProperties.dataType === 'undefined' && additionalProperties.required)) {
              value[key] = validatedValue;
            } else {
              fieldErrors[`${fieldPath}.${key}`] = {
                message: `No matching model found in additionalProperties to validate ${key}`,
                value: key,
              };
            }
          }
        });
      }
    }

    if (Object.keys(fieldErrors).length > previousErrors) {
      return;
    }

    return value;
  }

  /**
   * Creates a new ValidationService instance with specific configuration
   * @param overrides Configuration overrides
   * @returns New ValidationService instance
   */
  private createChildValidationService(overrides: Partial<AdditionalProps> = {}): ValidationService {
    return new ValidationService(this.models, {
      ...this.config,
      ...overrides,
    });
  }

  /**
   * Deep clones an object without using JSON.stringify/parse to avoid:
   * 1. Loss of undefined values
   * 2. Loss of functions
   * 3. Conversion of dates to strings
   * 4. Exponential escaping issues with nested objects
   */
  private deepClone<T>(obj: T): T {
    // Fast path for primitives
    if (obj === null || obj === undefined) {
      return obj;
    }

    const type = typeof obj;
    if (type !== 'object') {
      return obj;
    }

    // Handle built-in object types
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof RegExp) {
      return new RegExp(obj.source, obj.flags) as any;
    }

    if (obj instanceof Array) {
      const cloneArr: any[] = new Array(obj.length);
      for (let i = 0; i < obj.length; i++) {
        cloneArr[i] = this.deepClone(obj[i]);
      }
      return cloneArr as any;
    }

    if (Buffer && obj instanceof Buffer) {
      return Buffer.from(obj) as any;
    }

    // Handle plain objects
    const cloneObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloneObj[key] = this.deepClone(obj[key]);
      }
    }
    return cloneObj;
  }

  /**
   * Adds a summarized error to the fieldErrors object
   * @param fieldErrors The errors object to add to
   * @param errorKey The key for the error
   * @param prefix The error message prefix
   * @param subErrors Array of sub-errors to summarize
   * @param value The value that failed validation
   */
  private addSummarizedError(fieldErrors: FieldErrors, errorKey: string, prefix: string, subErrors: FieldErrors[], value: any): void {
    const maxErrorLength = this.config.maxValidationErrorSize ? this.config.maxValidationErrorSize - prefix.length : undefined;

    fieldErrors[errorKey] = {
      message: `${prefix}${this.summarizeValidationErrors(subErrors, maxErrorLength)}`,
      value,
    };
  }

  /**
   * Summarizes validation errors to prevent extremely large error messages
   * @param errors Array of field errors from union/intersection validation
   * @param maxLength Maximum length of the summarized message
   * @returns Summarized error message
   */
  private summarizeValidationErrors(errors: FieldErrors[], maxLength?: number): string {
    const effectiveMaxLength = maxLength || this.config.maxValidationErrorSize || 1000;

    // If there are no errors, return empty
    if (errors.length === 0) {
      return '[]';
    }

    // Start with a count of total errors
    const errorCount = errors.length;
    const summary: string[] = [];

    // Try to include first few errors
    let currentLength = 0;
    let includedErrors = 0;

    // Calculate the size of the suffix if we need to truncate
    const truncatedSuffix = `,...and ${errorCount} more errors]`;
    const reservedSpace = truncatedSuffix.length + 10; // +10 for safety margin

    for (const error of errors) {
      const errorStr = JSON.stringify(error);
      const projectedLength = currentLength + errorStr.length + (summary.length > 0 ? 1 : 0) + 2; // +1 for comma if not first, +2 for brackets

      if (projectedLength + reservedSpace < effectiveMaxLength && includedErrors < 3) {
        summary.push(errorStr);
        currentLength = projectedLength;
        includedErrors++;
      } else {
        break;
      }
    }

    // Build final message
    if (includedErrors < errorCount) {
      const result = `[${summary.join(',')},...and ${errorCount - includedErrors} more errors]`;
      // Make sure we don't exceed the limit
      if (result.length > effectiveMaxLength) {
        // If still too long, remove the last error and try again
        if (summary.length > 0) {
          summary.pop();
          includedErrors--;
          return `[${summary.join(',')},...and ${errorCount - includedErrors} more errors]`;
        }
      }
      return result;
    } else {
      return `[${summary.join(',')}]`;
    }
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
  title?: { value: string; errorMsg?: string };
}

export interface BooleanValidator {
  isBoolean?: { errorMsg?: string };
}

export interface ArrayValidator {
  isArray?: { errorMsg?: string };
  minItems?: { value: number; errorMsg?: string };
  maxItems?: { value: number; errorMsg?: string };
  uniqueItems?: { errorMsg?: string };
}

export type Validator = IntegerValidator | FloatValidator | DateValidator | DateTimeValidator | StringValidator | BooleanValidator | ArrayValidator;

export interface FieldErrors {
  [name: string]: { message: string; value?: any };
}

export interface Exception extends Error {
  status: number;
}

export class ValidateError extends Error implements Exception {
  public status = 400;
  public name = 'ValidateError';

  constructor(
    public fields: FieldErrors,
    public message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, ValidateError.prototype);
  }
}
