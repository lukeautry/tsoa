import { expect } from 'chai';
import 'mocha';
import { TsoaRoute, ValidateError, FieldErrors, ValidationService } from '@tsoa/runtime';
import { TypeAliasModel1, TypeAliasModel2 } from '../../fixtures/testModel';

it('ValidateError should be an instanceof ValidateError', () => {
  const validateError = new ValidateError({}, '');

  expect(validateError instanceof ValidateError).to.be.true;
  expect(validateError instanceof Error).to.be.true;
});

it('should allow additionalProperties (on a union) if noImplicitAdditionalProperties is set to silently-remove-extras', () => {
  // Arrange
  const refName = 'ExampleModel';
  const unionProperty: TsoaRoute.PropertySchema = {
    dataType: 'union',
    subSchemas: [{ ref: 'TypeAliasModel1' }, { ref: 'TypeAliasModel2' }],
    required: true,
  };
  const models: TsoaRoute.Models = {
    [refName]: {
      dataType: 'refObject',
      properties: {
        or: unionProperty,
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
  };
  const v = new ValidationService(models, {
    noImplicitAdditionalProperties: 'silently-remove-extras',
    bodyCoercion: true,
  });
  const errorDictionary: FieldErrors = {};
  const nameOfAdditionalProperty = 'I am the bad key name';
  const dataToValidate: TypeAliasModel1 = {
    value1: 'this is value 1',
  };
  dataToValidate[nameOfAdditionalProperty] = 'something extra';

  // Act
  const name = 'dataToValidate';
  const result = v.validateUnion('or', dataToValidate, errorDictionary, true, unionProperty, name + '.');

  // Assert
  expect(errorDictionary).to.deep.eq({});
  expect(result).to.eql({ value1: 'this is value 1' });
  if (result[nameOfAdditionalProperty]) {
    throw new Error(`dataToValidate.${nameOfAdditionalProperty} should have been removed because "silently-remove-extras" requires that excess properties be stripped.`);
  }
});

it('should throw if the data has additionalProperties (on a union) if noImplicitAdditionalProperties is set to throw-on-extras', () => {
  // Arrange
  const refName = 'ExampleModel';
  const unionPropertySchema: TsoaRoute.PropertySchema = {
    dataType: 'union',
    subSchemas: [{ ref: 'TypeAliasModel1' }, { ref: 'TypeAliasModel2' }],
    required: true,
  };
  const models: TsoaRoute.Models = {
    [refName]: {
      dataType: 'refObject',
      properties: {
        or: unionPropertySchema,
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
  };
  const v = new ValidationService(models, {
    noImplicitAdditionalProperties: 'throw-on-extras',
    bodyCoercion: true,
  });
  const errorDictionary: FieldErrors = {};
  const nameOfAdditionalProperty = 'I am the bad key name' as keyof TypeAliasModel1;
  const dataToValidate: TypeAliasModel1 = {
    value1: 'valueOne',
  };
  dataToValidate[nameOfAdditionalProperty] = 'something extra';

  // Act
  const name = 'dataToValidate';
  v.validateUnion('or', dataToValidate, errorDictionary, true, unionPropertySchema, name + '.');

  // Assert
  const errorKeys = Object.keys(errorDictionary);
  expect(errorKeys).to.have.lengthOf(1);
  const firstAndOnlyErrorKey = errorKeys[0];
  expect(errorDictionary[firstAndOnlyErrorKey].message).to.include(`Could not match the union against any of the items.`);
  expect(errorDictionary[firstAndOnlyErrorKey].message).to.include(nameOfAdditionalProperty);
  expect(errorDictionary[firstAndOnlyErrorKey].message).to.include(`is an excess property and therefore is not allowed`);
  if (!dataToValidate[nameOfAdditionalProperty]) {
    throw new Error(
      `dataToValidate.${nameOfAdditionalProperty} should have been there because .validateModel should NOT have removed it since it took the more severe option of producing an error instead.`,
    );
  }
});

it('should throw if the data has additionalProperties (on a intersection) if noImplicitAdditionalProperties is set to throw-on-extras', () => {
  // Arrange
  const refName = 'ExampleModel';
  const subSchemas: TsoaRoute.PropertySchema[] = [{ ref: 'TypeAliasModel1' }, { ref: 'TypeAliasModel2' }];
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
  };
  const v = new ValidationService(models, {
    noImplicitAdditionalProperties: 'throw-on-extras',
    bodyCoercion: true,
  });
  const errorDictionary: FieldErrors = {};
  const nameOfAdditionalProperty = 'extraKeyName' as keyof (TypeAliasModel1 & TypeAliasModel2); // pretend this is fine
  const expectedErrorMsg = `Could not match intersection against any of the possible combinations: [["value1","value2"]]`;
  const dataToValidate: TypeAliasModel1 & TypeAliasModel2 = {
    value1: 'this is value 1',
    value2: 'this is value 2',
  };
  dataToValidate[nameOfAdditionalProperty] = 'something extra';

  // Act
  const name = 'dataToValidate';
  v.validateIntersection('and', dataToValidate, errorDictionary, true, subSchemas, name + '.');

  // Assert
  const errorKeys = Object.keys(errorDictionary);
  expect(errorKeys).to.have.lengthOf(1);
  const firstAndOnlyErrorKey = errorKeys[0];
  expect(errorDictionary[firstAndOnlyErrorKey].message).to.eq(expectedErrorMsg);
  if (!dataToValidate[nameOfAdditionalProperty]) {
    throw new Error(
      `dataToValidate.${nameOfAdditionalProperty} should have been there because .validateModel should NOT have removed it since it took the more severe option of producing an error instead.`,
    );
  }
});

it('should throw if the data has additionalProperties (on a nested Object) if noImplicitAdditionalProperties is set to throw-on-extras', () => {
  // Arrange
  const refName = 'ExampleModel';
  const models: TsoaRoute.RefObjectModels = {
    [refName]: {
      dataType: 'refObject',
      properties: {
        objLiteral: {
          dataType: 'nestedObjectLiteral',
          nestedProperties: {
            nested: {
              dataType: 'nestedObjectLiteral',
              nestedProperties: {
                additionals: {
                  dataType: 'nestedObjectLiteral',
                  nestedProperties: {},
                  additionalProperties: {
                    ref: 'TypeAliasModel1',
                  },
                },
                allNestedOptional: {
                  dataType: 'nestedObjectLiteral',
                  nestedProperties: {
                    two: {
                      dataType: 'string',
                    },
                    one: {
                      dataType: 'string',
                    },
                  },
                  required: true,
                },
                optional: {
                  dataType: 'double',
                },
                bool: {
                  dataType: 'boolean',
                  required: true,
                },
              },
            },
            name: { dataType: 'string', required: true },
          },
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
  };
  const v = new ValidationService(models, {
    noImplicitAdditionalProperties: 'throw-on-extras',
    bodyCoercion: true,
  });
  const errorDictionary: FieldErrors = {};
  const dataToValidate = {
    name: '',
    // extra
    extra: 123,
    nested: {
      bool: true,
      allNestedOptional: {
        // extra
        removed: '123',
      },
      additionals: {
        one: { value1: 'one' },
        two: { value1: 'two' },
      },
    },
  };

  // Act
  const result = v.validateNestedObjectLiteral('objLiteral', dataToValidate, errorDictionary, true, models[refName].properties.objLiteral.nestedProperties, false, refName + '.');

  // Assert
  expect(errorDictionary).to.deep.eq({
    'ExampleModel.objLiteral': {
      message: '"extra" is an excess property and therefore is not allowed',
      value: { extra: 123 },
    },
    'ExampleModel.objLiteral.nested.allNestedOptional': {
      message: '"removed" is an excess property and therefore is not allowed',
      value: { removed: '123' },
    },
  });
  expect(result).to.eql(undefined);
});

it('should not throw if the data has additionalProperties (on a intersection) if noImplicitAdditionalProperties is set to silently-remove-extras', () => {
  // Arrange
  const refName = 'ExampleModel';
  const subSchemas: TsoaRoute.PropertySchema[] = [{ ref: 'TypeAliasModel1' }, { ref: 'TypeAliasModel2' }];
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
  };
  const v = new ValidationService(models, {
    noImplicitAdditionalProperties: 'silently-remove-extras',
    bodyCoercion: true,
  });
  const errorDictionary: FieldErrors = {};
  const nameOfAdditionalProperty = 'extraKeyName' as keyof (TypeAliasModel1 & TypeAliasModel2); // pretend this is fine
  const dataToValidate: TypeAliasModel1 & TypeAliasModel2 = {
    value1: 'this is value 1',
    value2: 'this is value 2',
  };
  dataToValidate[nameOfAdditionalProperty] = 'something extra';

  // Act
  const name = 'dataToValidate';
  const result = v.validateIntersection('and', dataToValidate, errorDictionary, true, subSchemas, name + '.');

  // Assert
  expect(errorDictionary).to.deep.eq({});
  if (result[nameOfAdditionalProperty]) {
    throw new Error(`dataToValidate.${nameOfAdditionalProperty} should have been removed because "silently-remove-extras" requires that excess properties be stripped.`);
  }
  expect(result).to.eql({
    value1: 'this is value 1',
    value2: 'this is value 2',
  });
});

it('should not throw if the data has additionalProperties (on a intersection) if noImplicitAdditionalProperties is set to ignore', () => {
  // Arrange
  const refName = 'ExampleModel';
  const subSchemas: TsoaRoute.PropertySchema[] = [{ ref: 'TypeAliasModel1' }, { ref: 'TypeAliasModel2' }];
  const models: TsoaRoute.Models = {
    [refName]: {
      dataType: 'refObject',
      properties: {
        and: {
          dataType: 'intersection',
          required: true,
          subSchemas,
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
  };
  const v = new ValidationService(models, {
    noImplicitAdditionalProperties: 'ignore',
    bodyCoercion: true,
  });
  const errorDictionary: FieldErrors = {};
  const nameOfAdditionalProperty = 'extraKeyName' as keyof (TypeAliasModel1 & TypeAliasModel2); // pretend this is fine
  const dataToValidate: TypeAliasModel1 & TypeAliasModel2 = {
    value1: 'this is value 1',
    value2: 'this is value 2',
  };
  dataToValidate[nameOfAdditionalProperty] = 'something extra';

  // Act
  const name = 'dataToValidate';
  const result = v.validateIntersection('and', dataToValidate, errorDictionary, true, subSchemas, name + '.');

  // Assert
  expect(errorDictionary).to.deep.eq({});
  expect(result).to.eql({
    value1: 'this is value 1',
    value2: 'this is value 2',
    [nameOfAdditionalProperty]: 'something extra',
  });
});

it('should not throw if the data has additionalProperties (on a nested Object) if noImplicitAdditionalProperties is set to silently-remove-extras', () => {
  // Arrange
  const refName = 'ExampleModel';
  const models: TsoaRoute.RefObjectModels = {
    [refName]: {
      dataType: 'refObject',
      properties: {
        objLiteral: {
          dataType: 'nestedObjectLiteral',
          nestedProperties: {
            nested: {
              dataType: 'nestedObjectLiteral',
              nestedProperties: {
                additionals: {
                  dataType: 'nestedObjectLiteral',
                  nestedProperties: {},
                  additionalProperties: {
                    ref: 'TypeAliasModel1',
                  },
                },
                allNestedOptional: {
                  dataType: 'nestedObjectLiteral',
                  nestedProperties: {
                    two: { dataType: 'string' },
                    one: {
                      dataType: 'string',
                    },
                  },
                  required: true,
                },
                optional: { dataType: 'double' },
                bool: { dataType: 'boolean', required: true },
              },
            },
            name: { dataType: 'string', required: true },
          },
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
  };
  const v = new ValidationService(models, {
    noImplicitAdditionalProperties: 'silently-remove-extras',
    bodyCoercion: true,
  });
  const errorDictionary: FieldErrors = {};
  const dataToValidate = {
    name: '',
    // extra
    extra: 123,
    nested: {
      bool: true,
      allNestedOptional: {
        // extra
        removed: '123',
      },
      additionals: {
        one: { value1: 'one' },
        two: { value1: 'two' },
      },
    },
  };

  // Act
  const result = v.validateNestedObjectLiteral('objLiteral', dataToValidate, errorDictionary, true, models[refName].properties.objLiteral.nestedProperties, false, refName + '.');

  // Assert
  expect(errorDictionary).to.deep.eq({});
  expect(result).to.eql({
    name: '',
    nested: {
      bool: true,
      allNestedOptional: {},
      additionals: {
        one: { value1: 'one' },
        two: { value1: 'two' },
      },
    },
  });
});

it('should not throw if the data has additionalProperties (on a nested Object) if noImplicitAdditionalProperties is set to ignore', () => {
  // Arrange
  const refName = 'ExampleModel';
  const models: TsoaRoute.RefObjectModels = {
    [refName]: {
      dataType: 'refObject',
      properties: {
        objLiteral: {
          dataType: 'nestedObjectLiteral',
          nestedProperties: {
            nested: {
              dataType: 'nestedObjectLiteral',
              nestedProperties: {
                additionals: {
                  dataType: 'nestedObjectLiteral',
                  nestedProperties: {},
                  additionalProperties: {
                    ref: 'TypeAliasModel1',
                  },
                },
                allNestedOptional: {
                  dataType: 'nestedObjectLiteral',
                  nestedProperties: {
                    two: {
                      dataType: 'string',
                    },
                    one: {
                      dataType: 'string',
                    },
                  },
                  required: true,
                },
                optional: {
                  dataType: 'double',
                },
                bool: {
                  dataType: 'boolean',
                  required: true,
                },
              },
            },
            name: { dataType: 'string', required: true },
          },
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
  };
  const v = new ValidationService(models, {
    noImplicitAdditionalProperties: 'ignore',
    bodyCoercion: true,
  });
  const errorDictionary: FieldErrors = {};
  const dataToValidate = {
    name: '',
    // extra
    extra: 123,
    nested: {
      bool: true,
      allNestedOptional: {
        // extra
        removed: '123',
      },
      additionals: {
        one: { value1: 'one' },
        two: { value1: 'two' },
      },
    },
  };

  // Act
  const result = v.validateNestedObjectLiteral('objLiteral', dataToValidate, errorDictionary, true, models[refName].properties.objLiteral.nestedProperties, false, refName + '.');

  // Assert
  expect(errorDictionary).to.deep.eq({});
  expect(result).to.eql({
    name: '',
    // extra
    extra: 123,
    nested: {
      bool: true,
      allNestedOptional: {
        // extra
        removed: '123',
      },
      additionals: {
        one: { value1: 'one' },
        two: { value1: 'two' },
      },
    },
  });
});

it('should throw if properties on nOl are missing', () => {
  const schema: { [name: string]: TsoaRoute.PropertySchema } = {
    country: { dataType: 'string', required: true },
    street: {
      dataType: 'nestedObjectLiteral',
      nestedProperties: {
        streetName: { dataType: 'string', required: true },
      },
      required: true,
      additionalProperties: true,
    },
  };

  const v = new ValidationService(
    {},
    {
      noImplicitAdditionalProperties: 'silently-remove-extras',
      bodyCoercion: true,
    },
  );

  const errors = {};

  v.validateNestedObjectLiteral('nested', {}, errors, true, schema, true, 'Model.');

  expect(Object.keys(errors).length).to.equal(2);

  expect(errors).to.deep.eq({
    'Model.nested.country': { message: "'country' is required", value: undefined },
    'Model.nested.street': { message: "'street' is required", value: undefined },
  });

  const nestedErrors = {};

  v.validateNestedObjectLiteral('nested', { street: {} }, nestedErrors, true, schema, true, 'Model.');

  expect(nestedErrors).to.deep.eq({
    'Model.nested.country': {
      message: "'country' is required",
      value: undefined,
    },
    'Model.nested.street.streetName': {
      message: "'streetName' is required",
      value: undefined,
    },
  });
});

it('should throw an Error', () => {
  expect(new ValidateError({}, '')).to.be.an.instanceof(Error);
});
