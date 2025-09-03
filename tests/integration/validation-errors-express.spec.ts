import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { app } from '../fixtures/express/server';

const basePath = '/v1';

describe('Validation Error Size - Express Server', () => {
  describe('Large Union Validation Errors', () => {
    it('should return reasonably sized error response for union validation failures', async () => {
      // Create a request that will fail validation against a union type
      const invalidUnionData = {
        unionProperty: {
          type: 'invalid',
          unknownProp: 'this should not be here',
          anotherUnknownProp: 123,
        },
      };

      const response = await request(app)
        .post(basePath + '/ValidationTest/UnionType')
        .send(invalidUnionData)
        .expect(400);

      // Check that the response size is reasonable
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).to.be.lessThan(2000, 'Union validation error response should be under 2KB');

      // Should still contain useful error information
      expect(response.body).to.have.property('fields');
      expect(response.body.message).to.exist;
    });
  });

  describe('Deep Model Validation Errors', () => {
    it('should not have excessive escaping in deep model errors', async () => {
      // Create deeply nested invalid data
      const deepInvalidData = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  shouldBeString: 123,
                  extraProp: 'not allowed',
                },
              },
            },
          },
        },
      };

      const response = await request(app)
        .post(basePath + '/ValidationTest/DeepModel')
        .send(deepInvalidData)
        .expect(400);

      // Check for excessive escaping
      const responseText = JSON.stringify(response.body);
      const backslashCount = (responseText.match(/\\\\/g) || []).length;

      expect(backslashCount).to.be.lessThan(20, 'Should not have excessive backslash escaping');
    });
  });

  describe('Complex Deep Union Errors', () => {
    it('should handle complex validation scenarios without huge responses', async () => {
      // Complex nested structure with unions
      const complexInvalidData = {
        type: 'complex',
        nested: {
          unionField: {
            type: 'typeA',
            nested: {
              deepUnion: {
                type: 'subType1',
                value: {
                  level1: {
                    level2: {
                      shouldBeNumber: 'not a number',
                      extraField: 'not allowed',
                    },
                    unexpectedField: true,
                  },
                },
              },
              anotherExtraField: 123,
            },
          },
          yetAnotherExtra: 'field',
        },
      };

      const response = await request(app)
        .post(basePath + '/ValidationTest/ComplexUnionModel')
        .send(complexInvalidData)
        .expect(400);

      // Total response should be reasonably sized
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).to.be.lessThan(10000, 'Complex validation error response should be under 10KB');

      // Should not have repeated nested error structures
      const responseText = JSON.stringify(response.body);
      const issuesCount = (responseText.match(/Issues:/g) || []).length;
      expect(issuesCount).to.be.lessThan(5, 'Should not have excessive nested Issues in error message');
    });
  });

  describe('Performance of Large Union Validation', () => {
    it('should validate large unions quickly without memory issues', async () => {
      // Create data that doesn't match any of many union options
      const largeUnionInvalidData = {
        largeUnion: {
          type: 'unknownType',
          value: 'does not match any schema',
        },
      };

      const startTime = Date.now();

      const response = await request(app)
        .post(basePath + '/ValidationTest/LargeUnion')
        .send(largeUnionInvalidData)
        .expect(400);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly
      expect(duration).to.be.lessThan(1000, 'Validation should complete in under 1 second');

      // Response should be bounded
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).to.be.lessThan(5000, 'Large union validation error should be under 5KB');
    });
  });
});
