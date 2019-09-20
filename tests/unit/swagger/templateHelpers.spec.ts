import { expect } from 'chai';
import 'mocha';
import { SwaggerConfigRelatedToRoutes } from '../../../src/routeGeneration/routeGenerator';
import { FieldErrors, ValidationService } from './../../../src/routeGeneration/templateHelpers';

describe('ValidationService', () => {
  describe('Model validate', () => {
    it('should validate a model with declared properties', () => {
      const v = new ValidationService({
        ExampleModel: {
          properties: {
            a: { dataType: 'string', required: true },
          },
        },
      });
      const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
        noImplicitAdditionalProperties: undefined,
      };
      const error = {};
      const result = v.validateModel({
        fieldErrors: error,
        minimalSwaggerConfig,
        name: '',
        refName: 'ExampleModel',
        value: { a: 's' },
      });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({ a: 's' });
    });

    it('should not allow additionalProperties if noImplicitAdditionalProperties is set to throw-on-extras', () => {
      // Arrange
      const refName = 'ExampleModel';
      const v = new ValidationService({
        [refName]: {
          additionalProperties: false,
          properties: {
            a: { dataType: 'string', required: true },
          },
        },
      });
      const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
        noImplicitAdditionalProperties: 'throw-on-extras',
      };
      const errorDictionary: FieldErrors = {};
      const nameOfAdditionalProperty = 'I am the bad key name';
      const dataToValidate = {
        a: 's',
        [nameOfAdditionalProperty]: 'something extra',
      };

      // Act
      v.validateModel({
        fieldErrors: errorDictionary,
        minimalSwaggerConfig,
        name: '',
        refName,
        value: dataToValidate,
      });

      // Assert
      const errorKeys = Object.keys(errorDictionary);
      expect(errorKeys).to.have.lengthOf(1);
      const firstAndOnlyErrorKey = errorKeys[0];
      expect(errorDictionary[firstAndOnlyErrorKey].message).to.eq(`"${nameOfAdditionalProperty}" is an excess property and therefore is not allowed`);
      if (!dataToValidate[nameOfAdditionalProperty]) {
        throw new Error(
          `dataToValidate.${nameOfAdditionalProperty} should have been there because .validateModel should NOT have removed it since it took the more severe option of producing an error instead.`,
        );
      }
    });

    it('should allow (but remove) additionalProperties if noImplicitAdditionalProperties is set to throw-on-extras', () => {
      // Arrange
      const refName = 'ExampleModel';
      const v = new ValidationService({
        [refName]: {
          additionalProperties: false,
          properties: {
            a: { dataType: 'string', required: true },
          },
        },
      });
      const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
        noImplicitAdditionalProperties: 'silently-remove-extras',
      };
      const errorDictionary: FieldErrors = {};
      const nameOfAdditionalProperty = 'I am the bad key name';
      const dataToValidate = {
        a: 's',
        [nameOfAdditionalProperty]: 'something extra',
      };

      // Act
      v.validateModel({
        fieldErrors: errorDictionary,
        minimalSwaggerConfig,
        name: '',
        refName,
        value: dataToValidate,
      });

      // Assert
      if (dataToValidate[nameOfAdditionalProperty]) {
        throw new Error(`dataToValidate.${nameOfAdditionalProperty} should NOT have been present because .validateModel should have removed it due to it being an excess property.`);
      }
      expect(dataToValidate).not.to.have.ownProperty(nameOfAdditionalProperty, '');
      const errorKeys = Object.keys(errorDictionary);
      expect(errorKeys).to.have.lengthOf(0);
    });

    it('should not allow additionalProperties if noImplicitAdditionalProperties is set to true', () => {
      // Arrange
      const refName = 'ExampleModel';
      const v = new ValidationService({
        [refName]: {
          additionalProperties: false,
          properties: {
            a: { dataType: 'string', required: true },
          },
        },
      });
      const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
        noImplicitAdditionalProperties: true,
      };
      const errorDictionary: FieldErrors = {};
      const nameOfAdditionalProperty = 'I am the bad key name';
      const dataToValidate = {
        a: 's',
        [nameOfAdditionalProperty]: 'something extra',
      };

      // Act
      v.validateModel({
        fieldErrors: errorDictionary,
        minimalSwaggerConfig,
        name: '',
        refName,
        value: dataToValidate,
      });

      // Assert
      const errorKeys = Object.keys(errorDictionary);
      expect(errorKeys).to.have.lengthOf(1);
      const firstAndOnlyErrorKey = errorKeys[0];
      expect(errorDictionary[firstAndOnlyErrorKey].message).to.eq(`"${nameOfAdditionalProperty}" is an excess property and therefore is not allowed`);
      if (!dataToValidate[nameOfAdditionalProperty]) {
        throw new Error(
          `dataToValidate.${nameOfAdditionalProperty} should have been there because .validateModel should NOT have removed it since it took the more severe option of producing an error instead.`,
        );
      }
    });

    it('should allow additionalProperties if noImplicitAdditionalProperties is set to false', () => {
      // Arrange
      const refName = 'ExampleModel';
      const v = new ValidationService({
        [refName]: {
          additionalProperties: false,
          properties: {
            a: { dataType: 'string', required: true },
          },
        },
      });
      const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
        noImplicitAdditionalProperties: false,
      };
      const errorDictionary: FieldErrors = {};
      const nameOfAdditionalProperty = 'I am the bad key name';
      const dataToValidate = {
        a: 's',
        [nameOfAdditionalProperty]: 'something extra',
      };

      // Act
      const result = v.validateModel({
        fieldErrors: errorDictionary,
        minimalSwaggerConfig,
        name: '',
        refName: 'ExampleModel',
        value: dataToValidate,
      });
      expect(Object.keys(errorDictionary)).to.be.empty;
      expect(result).to.eql({
        a: 's',
        [nameOfAdditionalProperty]: 'something extra',
      });
    });

    it('should not require optional properties', () => {
      const v = new ValidationService({
        ExampleModel: {
          properties: {
            a: { dataType: 'string' },
          },
        },
      });
      const error = {};
      const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
        noImplicitAdditionalProperties: undefined,
      };
      const result = v.validateModel({ name: '', value: {}, refName: 'ExampleModel', fieldErrors: error, minimalSwaggerConfig });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({ a: undefined });
    });

    it('should validate a model with additional properties', () => {
      const v = new ValidationService({
        ExampleModel: {
          additionalProperties: { dataType: 'any' },
        },
      });
      const error = {};
      const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
        // we're setting this to the "throw" to demonstrate that explicit additionalProperties should always be allowed
        noImplicitAdditionalProperties: 'throw-on-extras',
      };
      const result = v.validateModel({ name: '', value: { a: 's' }, refName: 'ExampleModel', fieldErrors: error, minimalSwaggerConfig });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({ a: 's' });
    });

    it('should validate a model with optional and additional properties', () => {
      const v = new ValidationService({
        ExampleModel: {
          additionalProperties: { dataType: 'any' },
          properties: {
            a: { dataType: 'string' },
          },
        },
      });
      const error = {};
      const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
        // This test should ignore this, otherwise there's a problem the code
        //      when the model has additionalProperties, that should take precedence since it's explicit
        noImplicitAdditionalProperties: 'throw-on-extras',
      };
      const result = v.validateModel({ name: '', value: {}, refName: 'ExampleModel', fieldErrors: error, minimalSwaggerConfig });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({ a: undefined });
    });

    it('should validate additional properties only against non-explicitly stated properties', () => {
      const v = new ValidationService({
        ExampleModel: {
          additionalProperties: {
            dataType: 'integer',
            validators: { minimum: { value: 10 } },
          },
          properties: {
            a: { dataType: 'integer' },
          },
        },
      });
      const error = {};
      const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
        // This test should ignore this, otherwise there's a problem the code
        //      when the model has additionalProperties, that should take precedence since it's explicit
        noImplicitAdditionalProperties: 'throw-on-extras',
      };
      const result = v.validateModel({ name: '', value: { a: 9 }, refName: 'ExampleModel', fieldErrors: error, minimalSwaggerConfig });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({ a: 9 });
    });
  });

  describe('Enum validate', () => {
    type Enumeration = string[] | number[];

    it('should enum number value', () => {
      const name = 'name';
      const value = '1';
      const error = {};
      const enumeration: Enumeration = ['0', '1'];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(value);
    });

    it('should enum string value', () => {
      const name = 'name';
      const value = 'HELLO';
      const error = {};
      const enumeration: Enumeration = ['HELLO'];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(value);
    });

    it('should enum no member', () => {
      const name = 'name';
      const value = 'HI';
      const error: any = {};
      const enumeration: Enumeration = [];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`no member`);
    });

    it('should enum out of member', () => {
      const name = 'name';
      const value = 'SAY';
      const error: any = {};
      const enumeration: Enumeration = ['HELLO', 'HI'];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['HELLO', 'HI']`);
    });

    it('accepts a string value of a numeric enum', () => {
      const name = 'name';
      const value = '1';
      const error: any = {};
      const enumeration: Enumeration = [0, 1];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(value);
    });

    it('accepts a numeric value of a string-numeric enum', () => {
      const name = 'name';
      const value = 1;
      const error: any = {};
      const enumeration: Enumeration = ['0', '1'];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(value);
    });

    it('should fail if the value is a non-numeric string for a numeric enum', () => {
      const name = 'name';
      const value = 'foo';
      const error: any = {};
      const enumeration: Enumeration = [1, 2];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [1, 2]`);
    });
  });

  describe('Integer validate', () => {
    it('should integer value', () => {
      const value = '10';
      const result = new ValidationService({}).validateInt('name', value, {});
      expect(result).to.equal(Number(value));
    });

    it('should invalid integer format', () => {
      const name = 'name';
      const value = '10.0';
      const error = {};
      const result = new ValidationService({}).validateInt(name, value, error);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`invalid integer number`);
    });

    it('should integer validate', () => {
      const name = 'name';
      const value = '11';
      const error = {};
      const validator = { minimum: { value: 10 }, maximum: { value: 12 } };
      const result = new ValidationService({}).validateInt(name, value, error, validator);
      expect(result).to.equal(Number(value));
    });

    it('should invalid integer min validate', () => {
      const name = 'name';
      const value = '11';
      const error = {};
      const validator = { minimum: { value: 12 } };
      const result = new ValidationService({}).validateInt(name, value, error, validator);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`min 12`);
    });

    it('should invalid integer max validate', () => {
      const name = 'name';
      const value = '11';
      const error = {};
      const validator = { maximum: { value: 10 } };
      const result = new ValidationService({}).validateInt(name, value, error, validator);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`max 10`);
    });
  });

  describe('Float validate', () => {
    it('should float value', () => {
      const value = '10';
      const result = new ValidationService({}).validateFloat('name', value, {});
      expect(result).to.equal(Number(value));
    });

    it('should invalid float format', () => {
      const name = 'name';
      const value = 'Hello';
      const error = {};
      const result = new ValidationService({}).validateFloat(name, value, error);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`invalid float number`);
    });

    it('should float validate', () => {
      const name = 'name';
      const value = '11.5';
      const error = {};
      const validator = { minimum: { value: 10 }, maximum: { value: 12 } };
      const result = new ValidationService({}).validateFloat(name, value, error, validator);
      expect(result).to.equal(Number(value));
    });

    it('should invalid float min validate', () => {
      const name = 'name';
      const value = '12.4';
      const error = {};
      const validator = { minimum: { value: 12.5 } };
      const result = new ValidationService({}).validateFloat(name, value, error, validator);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`min 12.5`);
    });

    it('should invalid float max validate', () => {
      const name = 'name';
      const value = '10.6';
      const error = {};
      const validator = { maximum: { value: 10.5 } };
      const result = new ValidationService({}).validateFloat(name, value, error, validator);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`max 10.5`);
    });
  });

  describe('Enum validate', () => {
    it('should enum number value', () => {
      const value = 1;
      const result = new ValidationService({}).validateEnum('name', value, {}, ['0', '1'] as any);
      expect(result).to.equal(value);
    });

    it('should enum empty string value', () => {
      const value = '';
      const result = new ValidationService({}).validateEnum('name', value, {}, [''] as any);
      expect(result).to.equal(value);
    });

    it('should enum null is not empty string value', () => {
      const value = null;
      const error: any = {};
      const name = 'name';
      const result = new ValidationService({}).validateEnum(name, value, error, [''] as any);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['']`);
    });

    it('should enum string value', () => {
      const value = 'HELLO';
      const result = new ValidationService({}).validateEnum('name', value, {}, ['HELLO'] as any);
      expect(result).to.equal(value);
    });

    it('should enum no member', () => {
      const error: any = {};
      const name = 'name';
      const value = 'HI';
      const result = new ValidationService({}).validateEnum(name, value, error, [] as any);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`no member`);
    });

    it('should enum out of member', () => {
      const error: any = {};
      const name = 'name';
      const value = 'SAY';
      const result = new ValidationService({}).validateEnum(name, value, error, ['HELLO', 'HI'] as any);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['HELLO', 'HI']`);
    });
  });

  describe('String validate', () => {
    it('should string value', () => {
      const value = 'Hello';
      const result = new ValidationService({}).validateString('name', value, {});
      expect(result).to.equal(value);
    });

    it('should string minLength validate', () => {
      const name = 'name';
      const value = 'AB';
      const error = {};
      const result = new ValidationService({}).validateString(name, value, error, { minLength: { value: 5 } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`minLength 5`);
    });

    it('should string maxLength validate', () => {
      const name = 'name';
      const value = 'ABCDE';
      const error = {};
      const result = new ValidationService({}).validateString(name, value, error, { maxLength: { value: 3 } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`maxLength 3`);
    });

    it('should string pattern validate', () => {
      const name = 'name';
      const value = 'ABC';
      const error = {};
      const result = new ValidationService({}).validateString(name, value, error, { pattern: { value: 'a-z' } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`Not match in 'a-z'`);
    });
  });

  describe('Date validate', () => {
    it('should date value', () => {
      const value = '2017-01-01';
      const result = new ValidationService({}).validateDate('name', value, {});
      expect(result).to.deep.equal(new Date(value));
    });

    it('should invalid date format', () => {
      const name = 'name';
      const value = '2017-33-11';
      const error = {};
      const result = new ValidationService({}).validateDate(name, value, error);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`invalid ISO 8601 date format, i.e. YYYY-MM-DD`);
    });

    it('should date minDate validate', () => {
      const name = 'name';
      const value = '2017-06-01';
      const error = {};
      const result = new ValidationService({}).validateDate(name, value, error, { minDate: { value: '2017-07-01' } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`minDate '2017-07-01'`);
    });

    it('should string maxDate validate', () => {
      const name = 'name';
      const value = '2017-06-01';
      const error = {};
      const result = new ValidationService({}).validateDate(name, value, error, { maxDate: { value: '2017-05-01' } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`maxDate '2017-05-01'`);
    });
  });

  describe('DateTime validate', () => {
    it('should datetime value', () => {
      const value = '2017-12-30T00:00:00';
      const result = new ValidationService({}).validateDateTime('name', value, {});
      expect(result).to.deep.equal(new Date(value));
    });

    it('should invalid datetime format', () => {
      const name = 'name';
      const value = '2017-12-309i';
      const error = {};
      const result = new ValidationService({}).validateDateTime(name, value, error);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss`);
    });

    it('should datetime minDate validate', () => {
      const name = 'name';
      const value = '2017-12-30T00:00:00';
      const error = {};
      const result = new ValidationService({}).validateDateTime(name, value, error, { minDate: { value: '2017-12-31T00:00:00' } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`minDate '2017-12-31T00:00:00'`);
    });

    it('should datetime maxDate validate', () => {
      const name = 'name';
      const value = '2017-12-30T00:00:00';
      const error = {};
      const result = new ValidationService({}).validateDateTime(name, value, error, { maxDate: { value: '2017-12-29T00:00:00' } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`maxDate '2017-12-29T00:00:00'`);
    });
  });

  describe('Array validate', () => {
    it('should array value', () => {
      const value = ['A', 'B', 'C'];
      const result = new ValidationService({}).validateArray('name', value, {}, {}, { dataType: 'string' });
      expect(result).to.deep.equal(value);
    });

    it('should invalid array value', () => {
      const name = 'name';
      const value = ['A', 10, true];
      const error = {};
      const result = new ValidationService({}).validateArray(name, value, error, {}, { dataType: 'integer' });
      expect(result).to.deep.equal([undefined, 10, undefined]);
      expect(error[`${name}.$0`].message).to.equal('invalid integer number');
      expect(error[`${name}.$0`].value).to.equal('A');
      expect(error[`${name}.$2`].message).to.equal('invalid integer number');
      expect(error[`${name}.$2`].value).to.equal(true);
    });

    it('should array minItems validate', () => {
      const name = 'name';
      const value = [80, 10, 199];
      const error = {};
      const result = new ValidationService({}).validateArray(name, value, error, {}, { dataType: 'integer' }, { minItems: { value: 4 } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`minItems 4`);
    });

    it('should array maxItems validate', () => {
      const name = 'name';
      const value = [80, 10, 199];
      const error = {};
      const result = new ValidationService({}).validateArray(name, value, error, {}, { dataType: 'integer' }, { maxItems: { value: 2 } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`maxItems 2`);
    });

    it('should array uniqueItems validate', () => {
      const name = 'name';
      const value = [10, 10, 20];
      const error = {};
      const result = new ValidationService({}).validateArray(name, value, error, {}, { dataType: 'integer' }, { uniqueItems: {} });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`required unique array`);
    });
  });
});
