import { expect } from 'chai';
import 'mocha';
import { FieldErrors, TsoaRoute, ValidationService } from '../../../src';
import { SwaggerConfigRelatedToRoutes } from '../../../src/routeGeneration/routeGenerator';
import { TypeAliasModel1, TypeAliasModel2 } from '../../fixtures/testModel';

/**
 * This is a convenience type so you can check .properties on the items in the Record without having TypeScript throw a compiler error. That's because this Record can't have enums in it. If you want that, then just use the base interface
 */
interface ModelsButOnlyRefObjects extends TsoaRoute.Models {
  [refNames: string]: TsoaRoute.RefObjectModelSchema
}

it('should allow additionalProperties (on a union) if noImplicitAdditionalProperties is set to silently-remove-extras', () => {
  // Arrange
  const refName = 'ExampleModel';
  const subSchemas: TsoaRoute.PropertySchema[] = [{ ref: 'TypeAliasModel1' }, { ref: 'TypeAliasModel2' }];
  const models: TsoaRoute.Models = {
    [refName]: {
      dataType: "refObject",
      properties: {
        or: {
          dataType: 'union',
          subSchemas,
          required: true,
        },
      },
    },
    TypeAliasModel1: {
      dataType: "refObject",
      properties: {
        value1: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
    TypeAliasModel2: {
      dataType: "refObject",
      properties: {
        value2: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
  };
  const v = new ValidationService(models);
  const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
    noImplicitAdditionalProperties: 'silently-remove-extras',
  };
  const errorDictionary: FieldErrors = {};
  const nameOfAdditionalProperty = 'I am the bad key name';
  const dataToValidate: TypeAliasModel1 = {
    value1: 'this is value 1',
  };
  (dataToValidate as any)[nameOfAdditionalProperty] = 'something extra';

  // Act
  const name = 'dataToValidate';
  const result = v.validateUnion('or', dataToValidate, errorDictionary, minimalSwaggerConfig, subSchemas, name + '.');

  // Assert
  expect(errorDictionary).to.deep.eq({});
  expect(result).to.eql({
    value1: 'this is value 1',
    value2: undefined,
  });
  if (result[nameOfAdditionalProperty]) {
    throw new Error(`dataToValidate.${nameOfAdditionalProperty} should have been removed because "silently-remove-extras" requires that excess properties be stripped.`);
  }
});

it('should throw if the data has additionalProperties (on a union) if noImplicitAdditionalProperties is set to throw-on-extras', () => {
  // Arrange
  const refName = 'ExampleModel';
  const subSchemas: TsoaRoute.PropertySchema[] = [{ ref: 'TypeAliasModel1' }, { ref: 'TypeAliasModel2' }];
  const models: TsoaRoute.Models = {
    [refName]: {
      dataType: "refObject",
      properties: {
        or: {
          dataType: 'union',
          subSchemas,
          required: true,
        },
      },
    },
    TypeAliasModel1: {
      dataType: "refObject",
      properties: {
        value1: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
    TypeAliasModel2: {
      dataType: "refObject",
      properties: {
        value2: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
  };
  const v = new ValidationService(models);
  const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
    noImplicitAdditionalProperties: 'throw-on-extras',
  };
  const errorDictionary: FieldErrors = {};
  const nameOfAdditionalProperty = 'I am the bad key name';
  const dataToValidate: TypeAliasModel1 = {
    value1: 'valueOne',
  };
  (dataToValidate as any)[nameOfAdditionalProperty] = 'something extra';

  // Act
  const name = 'dataToValidate';
  v.validateUnion('or', dataToValidate, errorDictionary, minimalSwaggerConfig, subSchemas, name + '.');

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
      dataType: "refObject",
      properties: {
        and: {
          dataType: 'intersection',
          subSchemas,
          required: true,
        },
      },
    },
    TypeAliasModel1: {
      dataType: "refObject",
      properties: {
        value1: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
    TypeAliasModel2: {
      dataType: "refObject",
      properties: {
        value2: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
  };
  const v = new ValidationService(models);
  const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
    noImplicitAdditionalProperties: 'throw-on-extras',
  };
  const errorDictionary: FieldErrors = {};
  const nameOfAdditionalProperty = 'extraKeyName';
  const expectedErrorMsg = `The following properties are not allowed by any part of the intersection: ${nameOfAdditionalProperty}`;
  const dataToValidate: TypeAliasModel1 & TypeAliasModel2 = {
    value1: 'this is value 1',
    value2: 'this is value 2',
  };
  (dataToValidate as any)[nameOfAdditionalProperty] = 'something extra';

  // Act
  const name = 'dataToValidate';
  v.validateIntersection('and', dataToValidate, errorDictionary, minimalSwaggerConfig, subSchemas, name + '.');

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
  const models: ModelsButOnlyRefObjects = {
    [refName]: {
      dataType: "refObject",
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
      dataType: "refObject",
      properties: {
        value1: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
  };
  const v = new ValidationService(models);
  const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
    noImplicitAdditionalProperties: true,
  };
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
  const result = v.validateNestedObjectLiteral('objLiteral', dataToValidate, errorDictionary, minimalSwaggerConfig, models[refName].properties.objLiteral.nestedProperties, false, refName + '.');

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

it('should not throw if the data has additionalProperties (on a intersection) if noImplicitAdditionalProperties is set to silently-remove-extras', () => {
  // Arrange
  const refName = 'ExampleModel';
  const subSchemas: TsoaRoute.PropertySchema[] = [{ ref: 'TypeAliasModel1' }, { ref: 'TypeAliasModel2' }];
  const models: TsoaRoute.Models = {
    [refName]: {
      dataType: "refObject",
      properties: {
        and: {
          dataType: 'intersection',
          subSchemas,
          required: true,
        },
      },
    },
    TypeAliasModel1: {
      dataType: "refObject",
      properties: {
        value1: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
    TypeAliasModel2: {
      dataType: "refObject",
      properties: {
        value2: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
  };
  const v = new ValidationService(models);
  const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
    noImplicitAdditionalProperties: 'silently-remove-extras',
  };
  const errorDictionary: FieldErrors = {};
  const nameOfAdditionalProperty = 'extraKeyName';
  const dataToValidate: TypeAliasModel1 & TypeAliasModel2 = {
    value1: 'this is value 1',
    value2: 'this is value 2',
  };
  (dataToValidate as any)[nameOfAdditionalProperty] = 'something extra';

  // Act
  const name = 'dataToValidate';
  const result = v.validateIntersection('and', dataToValidate, errorDictionary, minimalSwaggerConfig, subSchemas, name + '.');

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

it('should not throw if the data has additionalProperties (on a intersection) if noImplicitAdditionalProperties is set to false', () => {
  // Arrange
  const refName = 'ExampleModel';
  const subSchemas: TsoaRoute.PropertySchema[] = [{ ref: 'TypeAliasModel1' }, { ref: 'TypeAliasModel2' }];
  const models: TsoaRoute.Models = {
    [refName]: {
      dataType: "refObject",
      properties: {
        and: {
          dataType: 'intersection',
          required: true,
          subSchemas,
        },
      },
    },
    TypeAliasModel1: {
      dataType: "refObject",
      properties: {
        value1: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
    TypeAliasModel2: {
      dataType: "refObject",
      properties: {
        value2: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
  };
  const v = new ValidationService(models);
  const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
    noImplicitAdditionalProperties: false,
  };
  const errorDictionary: FieldErrors = {};
  const nameOfAdditionalProperty = 'extraKeyName';
  const dataToValidate: TypeAliasModel1 & TypeAliasModel2 = {
    value1: 'this is value 1',
    value2: 'this is value 2',
  };
  (dataToValidate as any)[nameOfAdditionalProperty] = 'something extra';

  // Act
  const name = 'dataToValidate';
  const result = v.validateIntersection('and', dataToValidate, errorDictionary, minimalSwaggerConfig, subSchemas, name + '.');

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
  const models: ModelsButOnlyRefObjects = {
    [refName]: {
      dataType: "refObject",
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
      dataType: "refObject",
      properties: {
        value1: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
  };
  const v = new ValidationService(models);
  const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
    noImplicitAdditionalProperties: 'silently-remove-extras',
  };
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
  const result = v.validateNestedObjectLiteral('objLiteral', dataToValidate, errorDictionary, minimalSwaggerConfig, models[refName].properties!.objLiteral.nestedProperties, false, refName + '.');

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

it('should not throw if the data has additionalProperties (on a nested Object) if noImplicitAdditionalProperties is set to false', () => {
  // Arrange
  const refName = 'ExampleModel';
  const models: ModelsButOnlyRefObjects = {
    [refName]: {
      dataType: "refObject",
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
      dataType: "refObject",
      properties: {
        value1: { dataType: 'string', required: true },
      },
      additionalProperties: false,
    },
  };
  const v = new ValidationService(models);
  const minimalSwaggerConfig: SwaggerConfigRelatedToRoutes = {
    noImplicitAdditionalProperties: false,
  };
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
  const result = v.validateNestedObjectLiteral('objLiteral', dataToValidate, errorDictionary, minimalSwaggerConfig, models[refName].properties!.objLiteral.nestedProperties, false, refName + '.');

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
