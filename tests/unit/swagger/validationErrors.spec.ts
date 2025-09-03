import { expect } from 'chai';
import 'mocha';
import { ValidationService, FieldErrors } from '../../../packages/runtime/src/routeGeneration/templateHelpers';
import { TsoaRoute } from '../../../packages/runtime/src/routeGeneration/tsoa-route';

describe('Validation Errors', () => {
  describe('Large Union Types', () => {
    it('should produce reasonably sized error messages for union validation failures', () => {
      // Create a union type with many options
      const unionSchema: TsoaRoute.PropertySchema = {
        dataType: 'union',
        subSchemas: [
          { dataType: 'nestedObjectLiteral', nestedProperties: { type: { dataType: 'string', required: true }, value1: { dataType: 'string', required: true } } },
          { dataType: 'nestedObjectLiteral', nestedProperties: { type: { dataType: 'string', required: true }, value2: { dataType: 'double', required: true } } },
          { dataType: 'nestedObjectLiteral', nestedProperties: { type: { dataType: 'string', required: true }, value3: { dataType: 'boolean', required: true } } },
          { dataType: 'nestedObjectLiteral', nestedProperties: { type: { dataType: 'string', required: true }, value4: { dataType: 'array', array: { dataType: 'string' }, required: true } } },
          { dataType: 'nestedObjectLiteral', nestedProperties: { type: { dataType: 'string', required: true }, value5: { dataType: 'datetime', required: true } } },
          { dataType: 'nestedObjectLiteral', nestedProperties: { type: { dataType: 'string', required: true }, value6: { dataType: 'double', required: true } } },
          { dataType: 'nestedObjectLiteral', nestedProperties: { type: { dataType: 'string', required: true }, value7: { dataType: 'float', required: true } } },
          { dataType: 'nestedObjectLiteral', nestedProperties: { type: { dataType: 'string', required: true }, value8: { dataType: 'integer', required: true } } },
          { dataType: 'nestedObjectLiteral', nestedProperties: { type: { dataType: 'string', required: true }, value9: { dataType: 'long', required: true } } },
          { dataType: 'nestedObjectLiteral', nestedProperties: { type: { dataType: 'string', required: true }, value10: { dataType: 'any', required: true } } },
        ],
        required: true,
      };

      const models: TsoaRoute.Models = {};
      const validationService = new ValidationService(models, { noImplicitAdditionalProperties: 'throw-on-extras', bodyCoercion: true });
      const fieldErrors: FieldErrors = {};

      // Try to validate data that doesn't match any union option
      const invalidData = { type: 'unknown', invalidProperty: 'test' };
      validationService.ValidateParam(unionSchema, invalidData, 'testParam', fieldErrors, true, '');

      // Check the error message
      expect(fieldErrors.testParam).to.exist;
      const errorMessage = fieldErrors.testParam.message;

      // The error message should be reasonably sized (under 1KB)
      expect(errorMessage.length).to.be.lessThan(1000, 'Union validation error message should be under 1KB');

      // It should contain useful information but not be overly verbose
      expect(errorMessage).to.include('Could not match the union');
    });
  });

  describe('Deep Model Validation', () => {
    it('should not have excessive escaping in deep model validation errors', () => {
      // Create a deeply nested structure
      const deepSchema: TsoaRoute.PropertySchema = {
        dataType: 'nestedObjectLiteral',
        nestedProperties: {
          level1: {
            dataType: 'nestedObjectLiteral',
            nestedProperties: {
              level2: {
                dataType: 'nestedObjectLiteral',
                nestedProperties: {
                  level3: {
                    dataType: 'nestedObjectLiteral',
                    nestedProperties: {
                      level4: {
                        dataType: 'nestedObjectLiteral',
                        nestedProperties: {
                          level5: {
                            dataType: 'string',
                            required: true,
                          },
                        },
                        required: true,
                      },
                    },
                    required: true,
                  },
                },
                required: true,
              },
            },
            required: true,
          },
        },
        required: true,
      };

      const models: TsoaRoute.Models = {};
      const validationService = new ValidationService(models, { noImplicitAdditionalProperties: 'throw-on-extras', bodyCoercion: true });
      const fieldErrors: FieldErrors = {};

      // Try to validate data with invalid deep property
      const invalidData = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 123, // Should be string
              },
            },
          },
        },
      };

      validationService.ValidateParam(deepSchema, invalidData, 'deepParam', fieldErrors, true, '');

      // Check that there's no excessive escaping
      const errorKey = Object.keys(fieldErrors)[0];
      const errorMessage = JSON.stringify(fieldErrors[errorKey]);

      // Count backslashes - there shouldn't be excessive escaping
      const backslashCount = (errorMessage.match(/\\/g) || []).length;
      expect(backslashCount).to.be.lessThan(10, 'Should not have excessive backslash escaping');
    });
  });

  describe('Combined Deep Union Validation', () => {
    it('should handle deep models with unions without creating massive error messages', () => {
      // Create a complex schema similar to the issue example
      const complexSchema: TsoaRoute.PropertySchema = {
        dataType: 'union',
        subSchemas: [
          {
            dataType: 'nestedObjectLiteral',
            nestedProperties: {
              type: { dataType: 'string', required: true },
              nested: {
                dataType: 'union',
                subSchemas: [
                  {
                    dataType: 'nestedObjectLiteral',
                    nestedProperties: {
                      subType: { dataType: 'string', required: true },
                      deepValue: {
                        dataType: 'nestedObjectLiteral',
                        nestedProperties: {
                          level1: {
                            dataType: 'nestedObjectLiteral',
                            nestedProperties: {
                              level2: { dataType: 'string', required: true },
                            },
                            required: true,
                          },
                        },
                        required: true,
                      },
                    },
                  },
                  {
                    dataType: 'nestedObjectLiteral',
                    nestedProperties: {
                      subType: { dataType: 'string', required: true },
                      simpleValue: { dataType: 'double', required: true },
                    },
                  },
                ],
                required: true,
              },
            },
          },
          {
            dataType: 'nestedObjectLiteral',
            nestedProperties: {
              type: { dataType: 'string', required: true },
              value: { dataType: 'string', required: true },
            },
          },
        ],
        required: true,
      };

      const models: TsoaRoute.Models = {};
      const validationService = new ValidationService(models, { noImplicitAdditionalProperties: 'throw-on-extras', bodyCoercion: true });
      const fieldErrors: FieldErrors = {};

      // Try to validate data that doesn't match
      const invalidData = {
        type: 'complex',
        nested: {
          subType: 'deep',
          deepValue: {
            level1: {
              level2: 123, // Should be string
              extraProp: 'should not be here',
            },
          },
          anotherExtraProp: 'also should not be here',
        },
      };

      validationService.ValidateParam(complexSchema, invalidData, 'complexParam', fieldErrors, true, '');

      // Serialize the entire error object
      const serializedErrors = JSON.stringify(fieldErrors);

      // The total serialized error should be reasonably sized
      expect(serializedErrors.length).to.be.lessThan(5000, 'Total validation error size should be under 5KB');

      // Should not contain excessive repetition
      const issuesMatch = serializedErrors.match(/Issues:/g);
      if (issuesMatch) {
        expect(issuesMatch.length).to.be.lessThan(3, 'Should not have excessive nested Issues: repetition');
      }
    });
  });

  describe('Error Message Configuration', () => {
    it('should respect maximum error size configuration when provided', () => {
      // This test will fail initially as the feature doesn't exist yet
      const models: TsoaRoute.Models = {};
      const config = {
        noImplicitAdditionalProperties: 'throw-on-extras' as const,
        bodyCoercion: true,
        maxValidationErrorSize: 500, // Limit to 500 characters
      };

      const validationService = new ValidationService(models, config);

      // Create a large union that would normally produce a huge error
      const largeUnion: TsoaRoute.PropertySchema = {
        dataType: 'union',
        subSchemas: Array.from({ length: 50 }, (_, i) => ({
          dataType: 'nestedObjectLiteral',
          nestedProperties: {
            type: { dataType: 'string', required: true },
            [`value${i}`]: { dataType: 'string', required: true },
          },
        })),
        required: true,
      };

      const fieldErrors: FieldErrors = {};
      validationService.ValidateParam(largeUnion, { invalid: 'data' }, 'param', fieldErrors, true, '');

      const errorMessage = fieldErrors.param?.message || '';
      expect(errorMessage.length).to.be.lessThanOrEqual(500, 'Error message should be truncated to configured max size');
    });
  });
});
