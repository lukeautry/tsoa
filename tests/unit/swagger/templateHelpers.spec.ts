import { expect } from 'chai';
import 'mocha';
import { TsoaRoute, FieldErrors, ValidationService } from '@tsoa/runtime';
import { TypeAliasDate, TypeAliasDateTime, TypeAliasModel1, TypeAliasModel2 } from 'fixtures/testModel';

describe('ValidationService', () => {
  describe('Model validate', () => {
    it('should validate a model with declared properties', () => {
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        properties: {
          a: { dataType: 'string', required: true },
        },
      };
      const v = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      );
      const error: FieldErrors = {};
      const result = v.validateModel({
        fieldErrors: error,
        isBodyParam: true,
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
      const v = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'throw-on-extras',
          bodyCoercion: true,
        },
      );
      const errorDictionary: FieldErrors = {};
      const nameOfAdditionalProperty = 'I am the bad key name';
      const dataToValidate = {
        a: 's',
        [nameOfAdditionalProperty]: 'something extra',
      };

      // Act
      v.validateModel({
        fieldErrors: errorDictionary,
        isBodyParam: true,
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
      const v = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'silently-remove-extras',
          bodyCoercion: true,
        },
      );
      const errorDictionary: FieldErrors = {};
      const nameOfAdditionalProperty = 'I am the bad key name';
      const dataToValidate = {
        a: 's',
        [nameOfAdditionalProperty]: 'something extra',
      };

      // Act
      v.validateModel({
        fieldErrors: errorDictionary,
        isBodyParam: true,
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
      const v = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      );
      const errorDictionary: FieldErrors = {};
      const nameOfAdditionalProperty = 'I am the bad key name';
      const dataToValidate = {
        a: 's',
        [nameOfAdditionalProperty]: 'something extra',
      };

      // Act
      const result = v.validateModel({
        fieldErrors: errorDictionary,
        isBodyParam: true,
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
      const v = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      );
      const error: FieldErrors = {};
      const result = v.validateModel({ name: '', value: {}, modelDefinition, fieldErrors: error, isBodyParam: true });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({});
    });

    it('should validate a model with additional properties', () => {
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        properties: {},
        additionalProperties: { dataType: 'any' },
      };
      const v = new ValidationService(
        {},
        {
          // we're setting this to the "throw" to demonstrate that explicit additionalProperties should always be allowed
          noImplicitAdditionalProperties: 'throw-on-extras',
          bodyCoercion: true,
        },
      );
      const error: FieldErrors = {};
      const result = v.validateModel({
        name: '',
        value: { a: 's' },
        modelDefinition,
        fieldErrors: error,

        isBodyParam: true,
      });
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
      const v = new ValidationService(
        {},
        {
          // This test should ignore this, otherwise there's a problem the code
          //      when the model has additionalProperties, that should take precedence since it's explicit
          noImplicitAdditionalProperties: 'throw-on-extras',
          bodyCoercion: true,
        },
      );
      const error: FieldErrors = {};
      const result = v.validateModel({ name: '', value: {}, modelDefinition, fieldErrors: error, isBodyParam: true });
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
      const v = new ValidationService(
        {},
        {
          // This test should ignore this, otherwise there's a problem the code
          //      when the model has additionalProperties, that should take precedence since it's explicit
          noImplicitAdditionalProperties: 'throw-on-extras',
          bodyCoercion: true,
        },
      );
      const error: FieldErrors = {};
      const result = v.validateModel({ name: '', value: { a: 9 }, modelDefinition, fieldErrors: error, isBodyParam: true });
      expect(Object.keys(error)).to.be.empty;
      expect(result).to.eql({ a: 9 });
    });

    it('non provided parameters should not result in undefined', () => {
      const v = new ValidationService(
        {
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
        },
        { noImplicitAdditionalProperties: 'ignore', bodyCoercion: true },
      );

      const error: FieldErrors = {};

      const result = v.ValidateParam(
        { required: true, ref: 'General' },
        {
          a: 'value',
          b: undefined,
        },
        'body',
        error,
        true,
        undefined,
      );

      expect(result).to.deep.equal({ a: 'value', b: undefined });
      expect(Object.keys(error)).to.be.empty;
      expect('a' in result).to.be.true; // provided
      expect('b' in result).to.be.true; // provided, but empty
      expect('c' in result).to.be.false; // not provided
    });

    it('required provided parameters should result in required errors', () => {
      const v = new ValidationService(
        {
          General: {
            dataType: 'refObject',
            properties: {
              a: { dataType: 'string', required: true },
            },
            additionalProperties: false,
          },
        },
        { noImplicitAdditionalProperties: 'ignore', bodyCoercion: true },
      );

      const error: FieldErrors = {};

      v.ValidateParam(
        { required: true, ref: 'General' },
        {
          c: 'value',
        },
        'body',
        error,
        true,
        undefined,
      );

      expect(error['body.a'].message).to.equal(`'a' is required`);
    });
  });

  describe('Param validate', () => {
    it('should apply defaults for optional properties', () => {
      const value = undefined;
      const propertySchema: TsoaRoute.PropertySchema = { dataType: 'integer', default: '666', required: false, validators: {} };
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).ValidateParam(propertySchema, value, 'defaultProp', {}, true, undefined);
      expect(result).to.equal(666);
    });

    it('should not override values with defaults', () => {
      const value = 123;
      const propertySchema: TsoaRoute.PropertySchema = { dataType: 'integer', default: '666', required: false, validators: {} };
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).ValidateParam(propertySchema, value, 'defaultProp', {}, true, undefined);
      expect(result).to.equal(123);
    });

    it('should apply defaults for required properties', () => {
      const value = undefined;
      const propertySchema: TsoaRoute.PropertySchema = { dataType: 'integer', default: '666', required: true, validators: {} };
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).ValidateParam(propertySchema, value, 'defaultProp', {}, true, undefined);
      expect(result).to.equal(666);
    });
  });

  describe('Integer validate', () => {
    it('should integer value', () => {
      const value = '10';
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateInt('name', value, {}, true);
      expect(result).to.equal(Number(value));
    });

    it('should invalid integer format', () => {
      const name = 'name';
      const value = '10.0';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateInt(name, value, error, true);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`invalid integer number`);
    });

    it('should integer validate', () => {
      const name = 'name';
      const value = '11';
      const error: FieldErrors = {};
      const validator = { minimum: { value: 10 }, maximum: { value: 12 } };
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateInt(name, value, error, true, validator);
      expect(result).to.equal(Number(value));
    });

    it('should invalid integer min validate', () => {
      const name = 'name';
      const value = '11';
      const error: FieldErrors = {};
      const validator = { minimum: { value: 12 } };
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateInt(name, value, error, true, validator);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`min 12`);
    });

    it('should invalid integer max validate', () => {
      const name = 'name';
      const value = '11';
      const error: FieldErrors = {};
      const validator = { maximum: { value: 10 } };
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateInt(name, value, error, true, validator);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`max 10`);
    });

    it('should return an error if bodyCoercion is false and a non-number value is provided', () => {
      const name = 'name';
      const value: any = '10';
      const error: FieldErrors = {};
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: false }).validateInt(name, value, error, true);
      expect(result).to.deep.equal(undefined);
      expect(error[name].message).to.equal('invalid integer number');
      expect(error[name].value).to.equal('10');
    });
  });

  describe('Float validate', () => {
    it('should float value', () => {
      const value = '10';
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateFloat('name', value, {}, true);
      expect(result).to.equal(Number(value));
    });

    it('should invalid float format', () => {
      const name = 'name';
      const value = 'Hello';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateFloat(name, value, error, true);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`invalid float number`);
    });

    it('should float validate', () => {
      const name = 'name';
      const value = '11.5';
      const error: FieldErrors = {};
      const validator = { minimum: { value: 10 }, maximum: { value: 12 } };
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateFloat(name, value, error, true, validator);
      expect(result).to.equal(Number(value));
    });

    it('should invalid float min validate', () => {
      const name = 'name';
      const value = '12.4';
      const error: FieldErrors = {};
      const validator = { minimum: { value: 12.5 } };
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateFloat(name, value, error, true, validator);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`min 12.5`);
    });

    it('should invalid float max validate', () => {
      const name = 'name';
      const value = '10.6';
      const error: FieldErrors = {};
      const validator = { maximum: { value: 10.5 } };
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateFloat(name, value, error, true, validator);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`max 10.5`);
    });

    it('should return an error if bodyCoercion is false and a non-number value is provided', () => {
      const name = 'name';
      const value: any = '10.1';
      const error: FieldErrors = {};
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: false }).validateFloat(name, value, error, true);
      expect(result).to.deep.equal(undefined);
      expect(error[name].message).to.equal('invalid float number');
      expect(error[name].value).to.equal('10.1');
    });
  });

  describe('Boolean validate', () => {
    it('should return true when submitted true', () => {
      const value = true;
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateBool('name', value, {}, true);
      expect(result).to.equal(true);
    });

    it('should return false when submitted false', () => {
      const value = false;
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateBool('name', value, {}, true);
      expect(result).to.equal(false);
    });

    it('should coerce strings to boolean values if body coercion is enabled', () => {
      const value = 'false';
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateBool('name', value, {}, true);
      expect(result).to.equal(false);
    });

    it('should return an error a non-boolean value is provided and body coercion is disabled', () => {
      const name = 'name';
      const value = 'false';
      const error: FieldErrors = {};
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: false }).validateBool(name, value, error, true);
      expect(result).to.deep.equal(undefined);
      expect(error[name].message).to.equal('invalid boolean value');
      expect(error[name].value).to.equal('false');
    });
  });

  describe('Enum validate', () => {
    type Enumeration = string[] | number[];

    it('should enum number value', () => {
      const name = 'name';
      const value = 1;
      const error: FieldErrors = {};
      const enumeration: Enumeration = [0, 1];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(value);
    });

    it('should enum empty string value', () => {
      const value = '';
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum('name', value, {}, ['']);
      expect(result).to.equal(value);
    });

    it('should enum null is not empty string value', () => {
      const value = null;
      const error: FieldErrors = {};
      const name = 'name';
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, ['']);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['']`);
    });

    it('should enum string value', () => {
      const name = 'name';
      const value = 'HELLO';
      const error: FieldErrors = {};
      const enumeration: Enumeration = ['HELLO'];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(value);
    });

    it('should enum no member', () => {
      const name = 'name';
      const value = 'HI';
      const error: FieldErrors = {};
      const enumeration: Enumeration = [];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`no member`);
    });

    it('should enum out of member', () => {
      const name = 'name';
      const value = 'SAY';
      const error: FieldErrors = {};
      const enumeration: Enumeration = ['HELLO', 'HI'];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['HELLO','HI']`);
    });

    it('does accept a string value for a numeric enum', () => {
      const name = 'name';
      const value = '1';
      const error: FieldErrors = {};
      const enumeration: Enumeration = [0, 1];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(1);
      expect(error).to.deep.equal({});
    });

    it('does not accept a wrong string value for a numeric enum', () => {
      const name = 'name';
      const value = '2';
      const error: FieldErrors = {};
      const enumeration: Enumeration = [0, 1];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [0,1]`);
    });

    it('does accept a numeric value for a string-numeric enum', () => {
      const name = 'name';
      const value = 1;
      const error: FieldErrors = {};
      const enumeration: Enumeration = ['0', '1'];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal('1');
      expect(error).to.deep.equal({});
    });

    it('does not accept an improper numeric value for a string-numeric enum', () => {
      const name = 'name';
      const value = 2;
      const error: FieldErrors = {};
      const enumeration: Enumeration = ['0', '1'];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['0','1']`);
    });

    it('should fail if the value is a non-numeric string for a numeric enum', () => {
      const name = 'name';
      const value = 'foo';
      const error: FieldErrors = {};
      const enumeration: Enumeration = [1, 2];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [1,2]`);
    });

    it('does accept a boolean value for a boolean enum', () => {
      const name = 'name';
      const value = false;
      const error: FieldErrors = {};
      const enumeration = [false];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(false);
      expect(error).to.deep.equal({});
    });

    it('does accept a stringified boolean value for a boolean enum', () => {
      const name = 'name';
      const value = 'true';
      const error: FieldErrors = {};
      const enumeration = [true];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(true);
      expect(error).to.deep.equal({});
    });

    it('does not accept a wrong members of a boolean enum', () => {
      const name = 'name';
      const value = false;
      const error: FieldErrors = {};
      const enumeration = [true];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [true]`);
    });

    it('does not accept a wrong members of a boolean enum', () => {
      const name = 'name';
      const value = 'false';
      const error: FieldErrors = {};
      const enumeration = [true];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [true]`);
    });

    it('accepts null in null enum', () => {
      const name = 'name';
      const value = null;
      const error: FieldErrors = {};
      const enumeration = [null];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(null);
      expect(error).to.deep.equal({});
    });

    it('accepts stringified null in null enum', () => {
      const name = 'name';
      const value = 'null';
      const error: FieldErrors = {};
      const enumeration = [null];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(null);
      expect(error).to.deep.equal({});
    });

    it('does not coerce null to 0', () => {
      const name = 'name';
      const value = 'null';
      const error: FieldErrors = {};
      const enumeration = [0];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [0]`);
    });

    it('does not coerce 0 to null', () => {
      const name = 'name';
      const value = 0;
      const error: FieldErrors = {};
      const enumeration = [null];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [null]`);
    });

    it('does not coerce null to false', () => {
      const name = 'name';
      const value = null;
      const error: FieldErrors = {};
      const enumeration = [false];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [false]`);
    });

    it('does not coerce false to null', () => {
      const name = 'name';
      const value = false;
      const error: FieldErrors = {};
      const enumeration = [null];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [null]`);
    });

    it('does not coerce 0 to false', () => {
      const name = 'name';
      const value = 0;
      const error: FieldErrors = {};
      const enumeration = [false];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [false]`);
    });

    it('does not coerce false to 0', () => {
      const name = 'name';
      const value = false;
      const error: FieldErrors = {};
      const enumeration = [0];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [0]`);
    });

    it("does not coerce null to ''", () => {
      const name = 'name';
      const value = null;
      const error: FieldErrors = {};
      const enumeration = [''];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['']`);
    });

    it("does not coerce '' to null", () => {
      const name = 'name';
      const value = '';
      const error: FieldErrors = {};
      const enumeration = [null];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [null]`);
    });

    it('does not coerce 1 to true', () => {
      const name = 'name';
      const value = 1;
      const error: FieldErrors = {};
      const enumeration = [true];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [true]`);
    });

    it('does not coerce true to 1', () => {
      const name = 'name';
      const value = true;
      const error: FieldErrors = {};
      const enumeration = [1];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; [1]`);
    });

    it("does not coerce true to '1'", () => {
      const name = 'name';
      const value = true;
      const error: FieldErrors = {};
      const enumeration = ['1'];
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateEnum(name, value, error, enumeration);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`should be one of the following; ['1']`);
    });
  });

  describe('String validate', () => {
    it('should string value', () => {
      const value = 'Hello';
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateString('name', value, {});
      expect(result).to.equal(value);
    });

    it('should string minLength validate', () => {
      const name = 'name';
      const value = 'AB';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateString(name, value, error, { minLength: { value: 5 } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`minLength 5`);
    });

    it('should string maxLength validate', () => {
      const name = 'name';
      const value = 'ABCDE';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateString(name, value, error, { maxLength: { value: 3 } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`maxLength 3`);
    });

    it('should string pattern validate', () => {
      const name = 'name';
      const value = 'ABC';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateString(name, value, error, { pattern: { value: 'a-z' } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`Not match in 'a-z'`);
    });
  });

  describe('Date validate', () => {
    it('should date value', () => {
      const value = '2017-01-01';
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateDate('name', value, {}, true);
      expect(result).to.deep.equal(new Date(value));
    });

    it('should invalid date format', () => {
      const name = 'name';
      const value = '2017-33-11';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateDate(name, value, error, true);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`invalid ISO 8601 date format, i.e. YYYY-MM-DD`);
    });

    it('should date minDate validate', () => {
      const name = 'name';
      const value = '2017-06-01';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateDate(name, value, error, true, { minDate: { value: '2017-07-01' } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`minDate '2017-07-01'`);
    });

    it('should string maxDate validate', () => {
      const name = 'name';
      const value = '2017-06-01';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateDate(name, value, error, true, { maxDate: { value: '2017-05-01' } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`maxDate '2017-05-01'`);
    });

    it('should return an error if bodyCoercion is false and a non-string value is provided', () => {
      const name = 'name';
      const value: any = 1234;
      const error: FieldErrors = {};
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: false }).validateDate(name, value, error, true);
      expect(result).to.deep.equal(undefined);
      expect(error[name].message).to.equal('invalid ISO 8601 date format, i.e. YYYY-MM-DD');
      expect(error[name].value).to.equal(1234);
    });
  });

  describe('DateTime validate', () => {
    it('should datetime value', () => {
      const value = '2017-12-30T00:00:00';
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateDateTime('name', value, {}, true);
      expect(result).to.deep.equal(new Date(value));
    });

    it('should invalid datetime format', () => {
      const name = 'name';
      const value = '2017-12-309i';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateDateTime(name, value, error, true);
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss`);
    });

    it('should datetime minDate validate', () => {
      const name = 'name';
      const value = '2017-12-30T00:00:00';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateDateTime(name, value, error, true, { minDate: { value: '2017-12-31T00:00:00' } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`minDate '2017-12-31T00:00:00'`);
    });

    it('should datetime maxDate validate', () => {
      const name = 'name';
      const value = '2017-12-30T00:00:00';
      const error: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).validateDateTime(name, value, error, true, { maxDate: { value: '2017-12-29T00:00:00' } });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`maxDate '2017-12-29T00:00:00'`);
    });

    it('should return an error if bodyCoercion is false and a non-string value is provided', () => {
      const name = 'name';
      const value: any = 1234;
      const error: FieldErrors = {};
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: false }).validateDateTime(name, value, error, true);
      expect(result).to.deep.equal(undefined);
      expect(error[name].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
      expect(error[name].value).to.equal(1234);
    });
  });

  describe('Array validate', () => {
    it('should array value', () => {
      const value = ['A', 'B', 'C'];
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: true }).validateArray('name', value, {}, true, { dataType: 'string' });
      expect(result).to.deep.equal(value);
    });

    it('should invalid array value', () => {
      const name = 'name';
      const value = ['A', 10, true];
      const error: FieldErrors = {};
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: true }).validateArray(name, value, error, true, { dataType: 'integer' });
      expect(result).to.deep.equal(undefined);
      expect(error[`${name}.$0`].message).to.equal('invalid integer number');
      expect(error[`${name}.$0`].value).to.equal('A');
      expect(error[`${name}.$2`].message).to.equal('invalid integer number');
      expect(error[`${name}.$2`].value).to.equal(true);
    });

    it('should invalid array nested value', () => {
      const name = 'name';
      const value = [{ a: 123 }, { a: 'bcd' }];
      const error: FieldErrors = {};
      const result = new ValidationService(
        {
          ExampleModel: {
            dataType: 'refObject',
            properties: {
              a: { dataType: 'string', required: true },
            },
          },
        },
        { noImplicitAdditionalProperties: 'ignore', bodyCoercion: true },
      ).validateArray(name, value, error, true, { ref: 'ExampleModel' });
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
      const error: FieldErrors = {};
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: true }).validateArray(
        name,
        value,
        error,
        true,
        { dataType: 'integer' },
        { minItems: { value: 4 } },
      );
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`minItems 4`);
    });

    it('should array maxItems validate', () => {
      const name = 'name';
      const value = [80, 10, 199];
      const error: FieldErrors = {};
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: true }).validateArray(
        name,
        value,
        error,
        true,
        { dataType: 'integer' },
        { maxItems: { value: 2 } },
      );
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`maxItems 2`);
    });

    it('should array uniqueItems validate', () => {
      const name = 'name';
      const value = [10, 10, 20];
      const error: FieldErrors = {};
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: true }).validateArray(name, value, error, true, { dataType: 'integer' }, { uniqueItems: {} });
      expect(result).to.equal(undefined);
      expect(error[name].message).to.equal(`required unique array`);
    });

    it('Should validate refEnum Arrays', () => {
      const enumModel: TsoaRoute.RefEnumModelSchema = {
        dataType: 'refEnum',
        enums: ['foo', 'bar'],
      };
      const v = new ValidationService(
        { enumModel },
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      );
      const fieldErrors = {};
      const result = v.validateArray('name', ['foo', 'bar', 'foo', 'foobar'], fieldErrors, true, { dataType: 'refEnum', ref: 'enumModel' });
      expect(Object.keys(fieldErrors)).to.not.be.empty;
      expect(result).to.be.undefined;
      expect(fieldErrors).to.deep.equal({ 'name.$3': { message: "should be one of the following; ['foo','bar']", value: 'foobar' } });
    });

    it('should return an error if bodyCoercion is false and a non-array value is provided', () => {
      const name = 'name';
      const value: any = 'some primitive string';
      const error: FieldErrors = {};
      const result = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: false }).validateArray(name, value, error, true, { dataType: 'string' });
      expect(result).to.deep.equal(undefined);
      expect(error[name].message).to.equal('invalid array');
      expect(error[name].value).to.equal('some primitive string');
    });
  });

  describe('Union validate', () => {
    it('should validate discriminated union with silently-remove-extras on', () => {
      const v = new ValidationService(
        {
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
        },
        {
          noImplicitAdditionalProperties: 'silently-remove-extras',
          bodyCoercion: true,
        },
      );
      const name = 'name';
      const error: FieldErrors = {};
      const schema: TsoaRoute.PropertySchema = { subSchemas: [{ ref: 'TypeA' }, { ref: 'TypeB' }] };
      const resultA = v.validateUnion(name, { type: 'A', a: 100 }, error, true, schema);
      const resultB = v.validateUnion(name, { type: 'B', b: 20 }, error, true, schema);
      expect(resultA).to.deep.equal({ type: 'A', a: 100 });
      expect(resultB).to.deep.equal({ type: 'B', b: 20 });
    });

    it('validates parent validators', () => {
      const v = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'silently-remove-extras',
          bodyCoercion: true,
        },
      );
      const errors = {};
      const schema: TsoaRoute.PropertySchema = { dataType: 'union', subSchemas: [{ dataType: 'integer' }, { dataType: 'string' }], required: true, validators: { minimum: { value: 5 } } };

      const result = v.validateUnion('union', 2, errors, true, schema);
      expect(errors).to.deep.equal({
        union: {
          message: 'Could not match the union against any of the items. Issues: [{"union":{"message":"min 5","value":2}},{"union":{"message":"invalid string value","value":2}}]',
          value: 2,
        },
      });
      expect(result).to.be.undefined;
    });
  });

  describe('Intersection Validate', () => {
    describe('throw on extras', () => {
      it('should validate intersection with 3 or more types', () => {
        const refName = 'ExampleModel';
        const subSchemas: TsoaRoute.PropertySchema[] = [{ ref: 'TypeAliasModel1' }, { ref: 'TypeAliasModel2' }, { ref: 'TypeAliasModelDateTime' }];
        const models: TsoaRoute.Models = {
          [refName]: {
            dataType: 'refObject',
            properties: {
              and: {
                dataType: 'intersection',
                subSchemas,
                required: true,
              },
            },
          },
          TypeAliasModel1: {
            dataType: 'refObject',
            properties: {
              value1: { dataType: 'string', required: true },
            },
            additionalProperties: false,
          },
          TypeAliasModel2: {
            dataType: 'refObject',
            properties: {
              value2: { dataType: 'string', required: true },
            },
            additionalProperties: false,
          },
          TypeAliasModelDateTime: {
            dataType: 'refObject',
            properties: {
              dateTimeValue: { dataType: 'datetime', required: true },
            },
            additionalProperties: false,
          },
          TypeAliasModelDate: {
            dataType: 'refObject',
            properties: {
              dateValue: { dataType: 'date', required: true },
            },
            additionalProperties: false,
          },
        };
        const v = new ValidationService(models, {
          noImplicitAdditionalProperties: 'throw-on-extras',
          bodyCoercion: true,
        });
        const errorDictionary: FieldErrors = {};
        const dataToValidate: TypeAliasModel1 & TypeAliasModel2 & TypeAliasDateTime = {
          value1: 'this is value 1',
          value2: 'this is value 2',
          dateTimeValue: '2017-01-01T00:00:00' as unknown as Date,
        };

        // Act
        const name = 'dataToValidate';
        const validatedData = v.validateIntersection('and', dataToValidate, errorDictionary, true, subSchemas, name + '.');

        // Assert
        const expectedValues = { ...dataToValidate, dateTimeValue: new Date('2017-01-01T00:00:00') };
        expect(errorDictionary).to.deep.equal({});
        expect(validatedData).to.deep.equal(expectedValues);

        const errorDictionary2: FieldErrors = {};
        const dataToValidate2: TypeAliasModel1 & TypeAliasModel2 & TypeAliasDateTime & TypeAliasDate = {
          ...dataToValidate,
          dateValue: '2017-01-01' as unknown as Date,
        };

        const subSchemas2 = subSchemas.concat([{ ref: 'TypeAliasModelDate' }]);
        const validatedData2 = v.validateIntersection('and', dataToValidate2, errorDictionary2, true, subSchemas2, name + '.');

        const expectedValues2 = { ...expectedValues, dateValue: new Date('2017-01-01') };
        expect(errorDictionary2).to.deep.equal({});
        expect(validatedData2).to.deep.equal(expectedValues2);
      });

      it('should validate intersection of one union', () => {
        const withUnionsName = 'withUnions';
        const withUnionsSubSchemas = [{ ref: 'ServiceObject' }, { ref: 'BigUnion' }];
        const WithUnionModels: TsoaRoute.Models = {
          [withUnionsName]: {
            dataType: 'refObject',
            properties: {
              unions: {
                dataType: 'intersection',
                subSchemas: withUnionsSubSchemas,
                required: true,
              },
            },
          },
          ServiceObject: {
            dataType: 'refObject',
            properties: {
              service: { dataType: 'enum', enums: ['23'], required: false },
            },
          },
          BigUnion: {
            dataType: 'refAlias',
            type: {
              dataType: 'union',
              subSchemas: [{ ref: 'Union1' }, { ref: 'Union2' }, { ref: 'Union3' }],
            },
          },
          Union1: {
            dataType: 'refObject',
            properties: {
              model: { dataType: 'string', required: true },
              barcode_format: { dataType: 'string', required: true },
            },
            additionalProperties: false,
          },
          Union2: {
            dataType: 'refObject',
            properties: {
              model: { dataType: 'string', required: true },
              barcode_format: { dataType: 'string', required: true },
              aProperty: { dataType: 'string', required: true },
            },
          },
          Union3: {
            dataType: 'refObject',
            properties: {
              model: { dataType: 'string', required: true },
              aAnotherProperty: { dataType: 'string', required: true },
            },
            additionalProperties: false,
          },
        };
        const withUnionValidationService = new ValidationService(WithUnionModels, {
          noImplicitAdditionalProperties: 'throw-on-extras',
          bodyCoercion: true,
        });
        const withUnionDataToValidate1 = {
          model: 'model1',
          service: '23',
        };
        const withUnionErrorDictionary1 = {};

        withUnionValidationService.validateIntersection('union', withUnionDataToValidate1, withUnionErrorDictionary1, true, withUnionsSubSchemas, withUnionsName + '.');

        // Assert
        expect(withUnionErrorDictionary1).to.deep.equal({
          'withUnions.union': {
            message: `Could not match the intersection against every type. Issues: [{"withUnions.union":{"message":"Could not match the union against any of the items. Issues: [{\\"withUnions.union.barcode_format\\":{\\"message\\":\\"'barcode_format' is required\\"}},{\\"withUnions.union.barcode_format\\":{\\"message\\":\\"'barcode_format' is required\\"},\\"withUnions.union.aProperty\\":{\\"message\\":\\"'aProperty' is required\\"}},{\\"withUnions.union.aAnotherProperty\\":{\\"message\\":\\"'aAnotherProperty' is required\\"}}]","value":{"model":"model1","service":"23"}}}]`,
            value: withUnionDataToValidate1,
          },
        });

        const withUnionDataToValidate2 = {
          model: 'model2',
          barcode_format: 'none',
          aProperty: 'blabla',
          service: '23',
        };
        const withUnionErrorDictionary2 = {};

        const validatedResult2 = withUnionValidationService.validateIntersection('union', withUnionDataToValidate2, withUnionErrorDictionary2, true, withUnionsSubSchemas, withUnionsName + '.');

        // Assert
        expect(withUnionErrorDictionary2).to.deep.equal({});
        expect(validatedResult2).to.deep.equal(withUnionDataToValidate2);

        const withUnionDataToValidate3 = {
          model: 'model3',
          aAnotherProperty: 'blabla',
          service: '23',
        };
        const withUnionErrorDictionary3 = {};

        const validatedResult3 = withUnionValidationService.validateIntersection('union', withUnionDataToValidate3, withUnionErrorDictionary3, true, withUnionsSubSchemas, withUnionsName + '.');

        // Assert
        expect(withUnionErrorDictionary3).to.deep.equal({});
        expect(validatedResult3).to.deep.equal(withUnionDataToValidate3);
      });

      it('should validate intersection of 3+ unions', () => {
        const refName = 'ExampleModel';
        const subSchemas = [{ ref: 'TypeAliasUnion1' }, { ref: 'TypeAliasUnion2' }, { ref: 'TypeAliasUnion3' }];
        const models: TsoaRoute.Models = {
          [refName]: {
            dataType: 'refObject',
            properties: {
              and: {
                dataType: 'intersection',
                subSchemas,
                required: true,
              },
            },
          },
          TypeAliasUnion1: {
            dataType: 'refAlias',
            type: {
              dataType: 'union',
              subSchemas: [{ ref: 'UnionModel1a' }, { ref: 'UnionModel1b' }],
            },
          },
          TypeAliasUnion2: {
            dataType: 'refAlias',
            type: {
              dataType: 'union',
              subSchemas: [{ ref: 'UnionModel2a' }, { ref: 'UnionModel2b' }],
            },
          },
          TypeAliasUnion3: {
            dataType: 'refAlias',
            type: {
              dataType: 'union',
              subSchemas: [{ ref: 'UnionModel3a' }, { ref: 'UnionModel3b' }],
            },
          },
          UnionModel1a: {
            dataType: 'refObject',
            properties: {
              value1a: { dataType: 'string', required: true },
            },
            additionalProperties: false,
          },
          UnionModel1b: {
            dataType: 'refObject',
            properties: {
              value1a: { dataType: 'boolean', required: true },
              value1b: { dataType: 'string', required: true },
            },
            additionalProperties: false,
          },
          UnionModel2a: {
            dataType: 'refObject',
            properties: {
              value2a: { dataType: 'string', required: true },
            },
            additionalProperties: false,
          },
          UnionModel2b: {
            dataType: 'refObject',
            properties: {
              value2b: { dataType: 'string', required: true },
            },
            additionalProperties: false,
          },
          UnionModel3a: {
            dataType: 'refObject',
            properties: {
              dateTimeValue: { dataType: 'datetime', required: true },
            },
            additionalProperties: false,
          },
          UnionModel3b: {
            dataType: 'refObject',
            properties: {
              dateValue: { dataType: 'date', required: true },
            },
            additionalProperties: false,
          },
        };
        const v = new ValidationService(models, {
          noImplicitAdditionalProperties: 'throw-on-extras',
          bodyCoercion: true,
        });

        // Validate all schema combinations
        const validInputs = [
          {
            input: { value1a: 'value 1a', value2a: 'value 2a', dateTimeValue: '2017-01-01T00:00:00' },
            output: { value1a: 'value 1a', value2a: 'value 2a', dateTimeValue: new Date('2017-01-01T00:00:00') },
          },
          {
            input: { value1a: 'value 1a', value2a: 'value 2a', dateValue: '2017-01-01' },
            output: { value1a: 'value 1a', value2a: 'value 2a', dateValue: new Date('2017-01-01') },
          },
          {
            input: { value1a: 'value 1a', value2b: 'value 2b', dateTimeValue: '2017-01-01T00:00:00' },
            output: { value1a: 'value 1a', value2b: 'value 2b', dateTimeValue: new Date('2017-01-01T00:00:00') },
          },
          {
            input: { value1a: 'value 1a', value2b: 'value 2b', dateValue: '2017-01-01' },
            output: { value1a: 'value 1a', value2b: 'value 2b', dateValue: new Date('2017-01-01') },
          },
          {
            input: { value1a: false, value1b: 'value 1b', value2a: 'value 2a', dateTimeValue: '2017-01-01T00:00:00' },
            output: { value1a: false, value1b: 'value 1b', value2a: 'value 2a', dateTimeValue: new Date('2017-01-01T00:00:00') },
          },
          {
            input: { value1a: false, value1b: 'value 1b', value2a: 'value 2a', dateValue: '2017-01-01' },
            output: { value1a: false, value1b: 'value 1b', value2a: 'value 2a', dateValue: new Date('2017-01-01') },
          },
          {
            input: { value1a: false, value1b: 'value 1b', value2b: 'value 2b', dateTimeValue: '2017-01-01T00:00:00' },
            output: { value1a: false, value1b: 'value 1b', value2b: 'value 2b', dateTimeValue: new Date('2017-01-01T00:00:00') },
          },
          {
            input: { value1a: false, value1b: 'value 1b', value2b: 'value 2b', dateValue: '2017-01-01' },
            output: { value1a: false, value1b: 'value 1b', value2b: 'value 2b', dateValue: new Date('2017-01-01') },
          },
        ];

        for (let i = 0; i < validInputs.length; i++) {
          const { input, output } = validInputs[i];

          // Act
          const errorDictionary: FieldErrors = {};
          const validatedData = v.validateIntersection('and', input, errorDictionary, true, subSchemas, refName + '.');

          // Assert
          expect(errorDictionary, `validInputs[${i}] returned errors`).to.deep.equal({});
          expect(validatedData, `validInputs[${i}] did not match output`).to.deep.equal(output);
        }

        // Invalid inputs
        const invalidDataTypes: any[] = [];
        const excessProperties: any[] = [];
        const missingRequiredProperties: any[] = [];

        for (const validInput of validInputs) {
          // Invalid datatype per key
          for (const key in validInput.input) {
            invalidDataTypes.push({ ...validInput.input, [key]: 123 });
          }

          // Excess properties
          excessProperties.push({ ...validInput.input, excessProperty: 'excess' });

          // Missing required properties
          for (const key in validInput.input) {
            const invalidInput = { ...validInput.input };
            delete invalidInput[key];
            missingRequiredProperties.push(invalidInput);
          }
        }

        function testInvalidInputs(name: string, inputs: any[]) {
          for (let i = 0; i < inputs.length; i++) {
            const invalidInput = inputs[i];

            // Act
            const errorDictionary: FieldErrors = {};
            const validatedData = v.validateIntersection('and', invalidInput, errorDictionary, true, subSchemas, refName + '.');

            // Assert
            expect(errorDictionary, `${name}[${i}] did not return errors`).to.not.deep.equal({});
            expect(validatedData, `${name}[${i}] returned data`).to.equal(undefined);
          }
        }

        testInvalidInputs('invalidDataTypes', invalidDataTypes);
        testInvalidInputs('excessProperties', excessProperties);
        testInvalidInputs('missingRequiredProperties', missingRequiredProperties);
      });
    });
  });

  describe('undefined validate', () => {
    const replacer = (key, value) => (typeof value === 'undefined' ? null : value);

    it('returns undefined when not optional', () => {
      const value = undefined;
      const propertySchema: TsoaRoute.PropertySchema = { dataType: 'undefined', required: true, validators: {} };
      const fieldErrors: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).ValidateParam(propertySchema, value, 'defaultProp', fieldErrors, true, undefined);
      expect(Object.keys(fieldErrors)).to.be.empty;
      expect(result).to.be.undefined;
    });

    it('fail if value required and not undefined', () => {
      const value = 'undefined';
      const propertySchema: TsoaRoute.PropertySchema = { dataType: 'undefined', required: true, validators: {} };
      const fieldErrors: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).ValidateParam(propertySchema, value, 'defaultProp', fieldErrors, true, undefined);
      expect(Object.keys(fieldErrors)).to.not.be.empty;
      expect(result).to.be.undefined;
    });

    it('should not return undefined when optional inside object', () => {
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        properties: {
          a: { dataType: 'undefined' },
        },
      };
      const v = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      );
      const error = {};
      const result = v.validateModel({ name: '', value: {}, modelDefinition, fieldErrors: error, isBodyParam: true });
      expect(Object.keys(error)).to.be.empty;
      // use JSON strngify to allow comparison of undefined values
      expect(JSON.stringify(result, replacer)).to.equal(JSON.stringify(result));
    });

    it('should return undefined when required in object', () => {
      const modelDefinition: TsoaRoute.ModelSchema = {
        dataType: 'refObject',
        properties: {
          a: { dataType: 'undefined', required: true },
        },
      };
      const v = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      );
      const error = {};
      const result = v.validateModel({ name: '', value: {}, modelDefinition, fieldErrors: error, isBodyParam: true });
      expect(Object.keys(error)).to.be.empty;
      // use JSON strngify to allow comparison of undefined values
      expect(JSON.stringify(result, replacer)).to.equal(JSON.stringify({ a: undefined }, replacer));
    });

    it('fail if value optional and not undefined', () => {
      const value = 'undefined';
      const propertySchema: TsoaRoute.PropertySchema = { dataType: 'undefined', required: false, validators: {} };
      const fieldErrors: FieldErrors = {};
      const result = new ValidationService(
        {},
        {
          noImplicitAdditionalProperties: 'ignore',
          bodyCoercion: true,
        },
      ).ValidateParam(propertySchema, value, 'defaultProp', fieldErrors, true, undefined);
      expect(Object.keys(fieldErrors)).to.not.be.empty;
      expect(result).to.be.undefined;
    });
  });

  describe('Circular reference handling', () => {
    it('should handle self-referencing refAlias without stack overflow', () => {
      const models: TsoaRoute.Models = {
        RecursiveType: {
          dataType: 'refAlias',
          type: { ref: 'RecursiveType' },
        },
      };

      const v = new ValidationService(models, {
        noImplicitAdditionalProperties: 'ignore',
        bodyCoercion: true,
      });

      const fieldErrors: FieldErrors = {};
      const value = { some: 'data' };

      const result = v.validateModel({
        name: '',
        value,
        modelDefinition: models.RecursiveType,
        fieldErrors,
        isBodyParam: true,
      });

      expect(result).to.deep.equal(value);
    });

    it('should handle deeply nested circular references', () => {
      const models: TsoaRoute.Models = {
        Widget: {
          dataType: 'refAlias',
          type: {
            dataType: 'union',
            subSchemas: [{ ref: 'Container' }, { ref: 'Wrapper' }],
          },
        },
        Container: {
          dataType: 'refObject',
          properties: {
            type: { dataType: 'string', required: true },
            items: {
              dataType: 'array',
              array: { ref: 'Widget' },
              required: true,
            },
          },
        },
        Wrapper: {
          dataType: 'refObject',
          properties: {
            type: { dataType: 'string', required: true },
            content: {
              ref: 'Widget',
              required: true,
            },
          },
        },
      };

      const v = new ValidationService(models, {
        noImplicitAdditionalProperties: 'ignore',
        bodyCoercion: true,
      });

      const fieldErrors: FieldErrors = {};

      const value = {
        type: 'container',
        items: [
          {
            type: 'wrapper',
            content: {
              type: 'nested-container',
              items: [
                {
                  type: 'deeply-nested-wrapper',
                  content: {
                    type: 'deeply-nested-container',
                    items: [],
                  },
                },
              ],
            },
          },
        ],
      };

      const result = v.validateModel({
        name: '',
        value,
        modelDefinition: models.Container,
        fieldErrors,
        isBodyParam: true,
      });

      expect(result).to.exist;
      expect(result.type).to.equal('container');
    });

    it('should handle circular references with arrays', () => {
      const models: TsoaRoute.Models = {
        Node: {
          dataType: 'refObject',
          properties: {
            id: { dataType: 'string', required: true },
            children: {
              dataType: 'array',
              array: { ref: 'Node' },
              required: false,
            },
          },
        },
      };

      const v = new ValidationService(models, {
        noImplicitAdditionalProperties: 'ignore',
        bodyCoercion: true,
      });

      const fieldErrors: FieldErrors = {};

      const value = {
        id: 'root',
        children: [
          {
            id: 'child1',
            children: [
              {
                id: 'grandchild1',
              },
            ],
          },
          {
            id: 'child2',
          },
        ],
      };

      const result = v.validateModel({
        name: '',
        value,
        modelDefinition: models.Node,
        fieldErrors,
        isBodyParam: true,
      });

      expect(result).to.exist;
      expect(result.id).to.equal('root');
      expect(result.children).to.have.lengthOf(2);
    });

    it('should properly fail validation for invalid data in circular types', () => {
      const models: TsoaRoute.Models = {
        Node: {
          dataType: 'refObject',
          properties: {
            id: { dataType: 'string', required: true },
            value: { dataType: 'integer', required: true },
            children: {
              dataType: 'array',
              array: { ref: 'Node' },
              required: false,
            },
          },
        },
      };

      const v = new ValidationService(models, {
        noImplicitAdditionalProperties: 'throw-on-extras',
        bodyCoercion: true,
      });

      const fieldErrors: FieldErrors = {};

      const value = {
        id: 'root',
        value: 1,
        children: [
          {
            value: 2,
            children: [
              {
                id: 'grandchild1',
                value: 3,
              },
            ],
          },
          {
            id: 'child2',
            value: 'not-a-number',
          },
        ],
      };

      const result = v.validateModel({
        name: '',
        value,
        modelDefinition: models.Node,
        fieldErrors,
        isBodyParam: true,
      });

      expect(Object.keys(fieldErrors)).to.not.be.empty;
      expect(fieldErrors).to.have.property('children.$0.id');
      expect(fieldErrors['children.$0.id'].message).to.include('required');
      expect(fieldErrors).to.have.property('children.$1.value');
      expect(fieldErrors['children.$1.value'].message).to.include('integer');
      expect(result).to.be.undefined;
    });

    it('should detect validation errors in deeply nested circular structures', () => {
      const models: TsoaRoute.Models = {
        Widget: {
          dataType: 'refAlias',
          type: {
            dataType: 'union',
            subSchemas: [{ ref: 'Container' }, { ref: 'Wrapper' }],
          },
        },
        Container: {
          dataType: 'refObject',
          properties: {
            type: { dataType: 'string', required: true },
            items: {
              dataType: 'array',
              array: { ref: 'Widget' },
              required: true,
            },
          },
        },
        Wrapper: {
          dataType: 'refObject',
          properties: {
            type: { dataType: 'string', required: true },
            content: {
              ref: 'Widget',
              required: true,
            },
          },
        },
      };

      const v = new ValidationService(models, {
        noImplicitAdditionalProperties: 'throw-on-extras',
        bodyCoercion: true,
      });

      const fieldErrors: FieldErrors = {};

      const value = {
        type: 'container',
        items: [
          {
            content: {
              type: 'nested-container',
              items: [],
            },
          },
        ],
      };

      const result = v.validateModel({
        name: '',
        value,
        modelDefinition: models.Container,
        fieldErrors,
        isBodyParam: true,
      });

      expect(Object.keys(fieldErrors)).to.not.be.empty;
      expect(result).to.be.undefined;
    });
  });
});
