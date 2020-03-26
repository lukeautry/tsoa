import { expect } from 'chai';
import 'mocha';
import { AdditionalProps } from '../../../src/routeGeneration/routeGenerator';
import { FieldErrors, TsoaRoute, ValidationService } from './../../../src/routeGeneration/templateHelpers';

describe('ValidationService', () => {
  describe('Model validate', () => {
    it('should validate a model with declared properties', () => {
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        properties: {
          a: { dataType: 'string', required: true },
        },
      };
      const v = new ValidationService({});
      const minimalSwaggerConfig: AdditionalProps = {
        noImplicitAdditionalProperties: 'ignore',
      };
      const error = {};
      const result = v.validateModel({
        fieldErrors: error,
        minimalSwaggerConfig,
        name: '',
        modelDefinition,
        value: { a: 's' },
      });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({ a: 's' });
    });

    it('should not allow additionalProperties if noImplicitAdditionalProperties is set to throw-on-extras', () => {
      // Arrange
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        additionalProperties: false,
        properties: {
          a: { dataType: 'string', required: true },
        },
      };
      const v = new ValidationService({});
      const minimalSwaggerConfig: AdditionalProps = {
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
        modelDefinition,
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

    it('should allow (but remove) additionalProperties if noImplicitAdditionalProperties is set to silently-remove-extras', () => {
      // Arrange
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        additionalProperties: false,
        properties: {
          a: { dataType: 'string', required: true },
        },
      };
      const v = new ValidationService({});
      const minimalSwaggerConfig: AdditionalProps = {
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
        modelDefinition,
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

    it('should allow additionalProperties if noImplicitAdditionalProperties is set to ignore', () => {
      // Arrange
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        additionalProperties: false,
        properties: {
          a: { dataType: 'string', required: true },
        },
      };
      const v = new ValidationService({});
      const minimalSwaggerConfig: AdditionalProps = {
        noImplicitAdditionalProperties: 'ignore',
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
        modelDefinition,
        value: dataToValidate,
      });
      expect(Object.keys(errorDictionary)).to.be.empty;
      expect(result).to.eql({
        a: 's',
        [nameOfAdditionalProperty]: 'something extra',
      });
    });

    it('should not require optional properties', () => {
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        properties: {
          a: { dataType: 'string' },
        },
      };
      const v = new ValidationService({});
      const error = {};
      const minimalSwaggerConfig: AdditionalProps = {
        noImplicitAdditionalProperties: 'ignore',
      };
      const result = v.validateModel({ name: '', value: {}, modelDefinition, fieldErrors: error, minimalSwaggerConfig });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({});
    });

    it('should validate a model with additional properties', () => {
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        properties: {},
        additionalProperties: { dataType: 'any' },
      };
      const v = new ValidationService({});
      const error = {};
      const minimalSwaggerConfig: AdditionalProps = {
        // we're setting this to the "throw" to demonstrate that explicit additionalProperties should always be allowed
        noImplicitAdditionalProperties: 'throw-on-extras',
      };
      const result = v.validateModel({ name: '', value: { a: 's' }, modelDefinition, fieldErrors: error, minimalSwaggerConfig });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({ a: 's' });
    });

    it('should validate a model with optional and additional properties', () => {
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        additionalProperties: { dataType: 'any' },
        properties: {
          a: { dataType: 'string' },
        },
      };
      const v = new ValidationService({});
      const error = {};
      const minimalSwaggerConfig: AdditionalProps = {
        // This test should ignore this, otherwise there's a problem the code
        //      when the model has additionalProperties, that should take precedence since it's explicit
        noImplicitAdditionalProperties: 'throw-on-extras',
      };
      const result = v.validateModel({ name: '', value: {}, modelDefinition, fieldErrors: error, minimalSwaggerConfig });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({});
    });

    it('should validate additional properties only against non-explicitly stated properties', () => {
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        additionalProperties: {
          dataType: 'integer',
          validators: { minimum: { value: 10 } },
        },
        properties: {
          a: { dataType: 'integer' },
        },
      };
      const v = new ValidationService({});
      const error = {};
      const minimalSwaggerConfig: AdditionalProps = {
        // This test should ignore this, otherwise there's a problem the code
        //      when the model has additionalProperties, that should take precedence since it's explicit
        noImplicitAdditionalProperties: 'throw-on-extras',
      };
      const result = v.validateModel({ name: '', value: { a: 9 }, modelDefinition, fieldErrors: error, minimalSwaggerConfig });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({ a: 9 });
    });

    it('non provided parameters should not result in undefined', () => {
      const v = new ValidationService({
        BEnum: {
          dataType: 'refEnum',
          enums: ['X', 'Y'],
        },
        General: {
          dataType: 'refObject',
          properties: {
            a: { dataType: 'string' },
            b: { ref: 'BEnum' },
            c: { dataType: 'string' },
          },
          additionalProperties: false,
        },
      });

      const error = {};

      const result = v.ValidateParam(
        { required: true, ref: 'General' },
        {
          a: 'value',
          b: undefined,
        },
        'body',
        error,
        undefined,
        { noImplicitAdditionalProperties: 'ignore' },
      );

      expect(result).to.deep.equal({ a: 'value', b: undefined });
      expect(Object.keys(error)).to.be.empty;
      expect('a' in result).to.be.true; // provided
      expect('b' in result).to.be.true; // provided, but empty
      expect('c' in result).to.be.false; // not provided
    });

    it('required provided parameters should result in required errors', () => {
      const v = new ValidationService({
        General: {
          dataType: 'refObject',
          properties: {
            a: { dataType: 'string', required: true },
          },
          additionalProperties: false,
        },
      });

      const error: any = {};

      v.ValidateParam(
        { required: true, ref: 'General' },
        {
          c: 'value',
        },
        'body',
        error,
        undefined,
        { noImplicitAdditionalProperties: 'ignore' },
      );

      expect(error['body.a'].message).to.equal(`'a' is required`);
    });
  });

  describe('Param validate', () => {
    it('Should apply defaults for optional properties', () => {
      const value = undefined;
      const propertySchema: TsoaRoute.PropertySchema = { dataType: 'integer', default: '666', required: false, validators: {} };
      const minimalSwaggerConfig: AdditionalProps = {
        noImplicitAdditionalProperties: 'ignore',
      };
      const result = new ValidationService({}).ValidateParam(propertySchema, value, 'defaultProp', {}, undefined, minimalSwaggerConfig);
      expect(result).to.equal(666);
    });

    it('Should not override values with defaults', () => {
      const value = 123;
      const propertySchema: TsoaRoute.PropertySchema = { dataType: 'integer', default: '666', required: false, validators: {} };
      const minimalSwaggerConfig: AdditionalProps = {
        noImplicitAdditionalProperties: 'ignore',
      };
      const result = new ValidationService({}).ValidateParam(propertySchema, value, 'defaultProp', {}, undefined, minimalSwaggerConfig);
      expect(result).to.equal(123);
    });

    it('Should apply defaults for required properties', () => {
      const value = undefined;
      const propertySchema: TsoaRoute.PropertySchema = { dataType: 'integer', default: '666', required: true, validators: {} };
      const minimalSwaggerConfig: AdditionalProps = {
        noImplicitAdditionalProperties: 'ignore',
      };
      const result = new ValidationService({}).ValidateParam(propertySchema, value, 'defaultProp', {}, undefined, minimalSwaggerConfig);
      expect(result).to.equal(666);
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
    type Enumeration = string[] | number[];

    it('should enum number value', () => {
      const name = 'name';
      const value = 1;
      const error = {};
      const enumeration: Enumeration = [0, 1];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(value);
    });

    it('should enum empty string value', () => {
      const value = '';
      const result = new ValidationService({}).validateEnum('name', value, {}, [''] as any);
      expect(result).to.equal(value);
    });

    it('should enum null is not empty string value', () => {
      const value = null;
      const error = {};
      const name = 'name';
      const result = new ValidationService({}).validateEnum(name, value, error, [''] as any);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['']`);
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
      const error = {};
      const enumeration: Enumeration = [];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`no member`);
    });

    it('should enum out of member', () => {
      const name = 'name';
      const value = 'SAY';
      const error = {};
      const enumeration: Enumeration = ['HELLO', 'HI'];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['HELLO','HI']`);
    });

    it('does accepts a string value for a numeric enum', () => {
      const name = 'name';
      const value = '1';
      const error = {};
      const enumeration: Enumeration = [0, 1];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(1);
      expect(error).to.deep.equal({});
    });

    it('does not accept a wrong string value for a numeric enum', () => {
      const name = 'name';
      const value = '2';
      const error = {};
      const enumeration: Enumeration = [0, 1];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [0,1]`);
    });

    it('does accepts a numeric value for a string-numeric enum', () => {
      const name = 'name';
      const value = 1;
      const error = {};
      const enumeration: Enumeration = ['0', '1'];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal('1');
      expect(error).to.deep.equal({});
    });

    it('does not accept an improper numeric value for a string-numeric enum', () => {
      const name = 'name';
      const value = 2;
      const error = {};
      const enumeration: Enumeration = ['0', '1'];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['0','1']`);
    });

    it('should fail if the value is a non-numeric string for a numeric enum', () => {
      const name = 'name';
      const value = 'foo';
      const error = {};
      const enumeration: Enumeration = [1, 2];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [1,2]`);
    });

    it('does accepts a boolean value for a boolean enum', () => {
      const name = 'name';
      const value = false;
      const error = {};
      const enumeration = [false];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(false);
      expect(error).to.deep.equal({});
    });

    it('does accepts a stringified boolean value for a boolean enum', () => {
      const name = 'name';
      const value = 'true';
      const error = {};
      const enumeration = [true];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(true);
      expect(error).to.deep.equal({});
    });

    it('does not accept a wrong members of a boolean enum', () => {
      const name = 'name';
      const value = false;
      const error = {};
      const enumeration = [true];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [true]`);
    });

    it('does not accept a wrong members of a boolean enum', () => {
      const name = 'name';
      const value = 'false';
      const error = {};
      const enumeration = [true];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [true]`);
    });

    it('accepts null in null enum', () => {
      const name = 'name';
      const value = null;
      const error = {};
      const enumeration = [null];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(null);
      expect(error).to.deep.equal({});
    });

    it('accepts stringified null in null enum', () => {
      const name = 'name';
      const value = 'null';
      const error = {};
      const enumeration = [null];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(null);
      expect(error).to.deep.equal({});
    });

    it('does not coerce null to 0', () => {
      const name = 'name';
      const value = 'null';
      const error = {};
      const enumeration = [0];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [0]`);
    });

    it('does not coerce 0 to null', () => {
      const name = 'name';
      const value = 0;
      const error = {};
      const enumeration = [null];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [null]`);
    });

    it('does not coerce null to false', () => {
      const name = 'name';
      const value = null;
      const error = {};
      const enumeration = [false];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [false]`);
    });

    it('does not coerce false to null', () => {
      const name = 'name';
      const value = false;
      const error = {};
      const enumeration = [null];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [null]`);
    });

    it('does not coerce 0 to false', () => {
      const name = 'name';
      const value = 0;
      const error = {};
      const enumeration = [false];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [false]`);
    });

    it('does not coerce false to 0', () => {
      const name = 'name';
      const value = false;
      const error = {};
      const enumeration = [0];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [0]`);
    });

    it("does not coerce null to ''", () => {
      const name = 'name';
      const value = null;
      const error = {};
      const enumeration = [''];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['']`);
    });

    it("does not coerce '' to null", () => {
      const name = 'name';
      const value = '';
      const error = {};
      const enumeration = [null];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [null]`);
    });

    it('does not coerce 1 to true', () => {
      const name = 'name';
      const value = 1;
      const error = {};
      const enumeration = [true];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [true]`);
    });

    it('does not coerce true to 1', () => {
      const name = 'name';
      const value = true;
      const error = {};
      const enumeration = [1];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [1]`);
    });

    it("does not coerce true to '1'", () => {
      const name = 'name';
      const value = true;
      const error = {};
      const enumeration = ['1'];
      const result = new ValidationService({}).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['1']`);
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
      const result = new ValidationService({}).validateArray('name', value, {}, { noImplicitAdditionalProperties: 'ignore' }, { dataType: 'string' });
      expect(result).to.deep.equal(value);
    });

    it('should invalid array value', () => {
      const name = 'name';
      const value = ['A', 10, true];
      const error = {};
      const result = new ValidationService({}).validateArray(name, value, error, { noImplicitAdditionalProperties: 'ignore' }, { dataType: 'integer' });
      expect(result).to.deep.equal(undefined);
      expect(error[`${name}.$0`].message).to.equal('invalid integer number');
      expect(error[`${name}.$0`].value).to.equal('A');
      expect(error[`${name}.$2`].message).to.equal('invalid integer number');
      expect(error[`${name}.$2`].value).to.equal(true);
    });

    it('should invalid array nested value', () => {
      const name = 'name';
      const value = [{ a: 123 }, { a: 'bcd' }];
      const error = {};
      const result = new ValidationService({
        ExampleModel: {
          dataType: 'refObject',
          properties: {
            a: { dataType: 'string', required: true },
          },
        },
      }).validateArray(name, value, error, { noImplicitAdditionalProperties: 'ignore' }, { ref: 'ExampleModel' });
      expect(result).to.deep.equal(undefined);
      expect(error).to.deep.equal({
        [`${name}.$0.a`]: {
          message: 'invalid string value',
          value: 123,
        },
      });
    });

    it('should array minItems validate', () => {
      const name = 'name';
      const value = [80, 10, 199];
      const error = {};
      const result = new ValidationService({}).validateArray(name, value, error, { noImplicitAdditionalProperties: 'ignore' }, { dataType: 'integer' }, { minItems: { value: 4 } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`minItems 4`);
    });

    it('should array maxItems validate', () => {
      const name = 'name';
      const value = [80, 10, 199];
      const error = {};
      const result = new ValidationService({}).validateArray(name, value, error, { noImplicitAdditionalProperties: 'ignore' }, { dataType: 'integer' }, { maxItems: { value: 2 } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`maxItems 2`);
    });

    it('should array uniqueItems validate', () => {
      const name = 'name';
      const value = [10, 10, 20];
      const error = {};
      const result = new ValidationService({}).validateArray(name, value, error, { noImplicitAdditionalProperties: 'ignore' }, { dataType: 'integer' }, { uniqueItems: {} });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`required unique array`);
    });
  });

  describe('Union validate', () => {
    it('should validate discriminated union with silently-remove-extras on', () => {
      const v = new ValidationService({
        TypeA: {
          dataType: 'refObject',
          properties: {
            type: { dataType: 'enum', enums: ['A'], required: true },
            a: { dataType: 'double', required: true },
          },
        },
        TypeB: {
          dataType: 'refObject',
          properties: {
            type: { dataType: 'enum', enums: ['B'], required: true },
            b: { dataType: 'double', required: true },
          },
        },
      });
      const name = 'name';
      const error = {};
      const minimalSwaggerConfig: AdditionalProps = {
        noImplicitAdditionalProperties: 'silently-remove-extras',
      };
      const subSchemas = [{ ref: 'TypeA' }, { ref: 'TypeB' }];
      const resultA = v.validateUnion(name, { type: 'A', a: 100 }, error, minimalSwaggerConfig, subSchemas);
      const resultB = v.validateUnion(name, { type: 'B', b: 20 }, error, minimalSwaggerConfig, subSchemas);
      expect(resultA).to.deep.equal({ type: 'A', a: 100 });
      expect(resultB).to.deep.equal({ type: 'B', b: 20 });
    });
  });
});
