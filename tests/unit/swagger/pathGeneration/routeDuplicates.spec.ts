import { expect } from 'chai';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';

it('should reject methods with same routes', () => {
  expect(() => {
    new MetadataGenerator('./tests/fixtures/controllers/duplicateMethodsController.ts').Generate();
  }).to.throw(`Duplicate method signature @get(GetTest/Complex) found in controllers: DuplicateMethodsTestController#getModel, DuplicateMethodsTestController#duplicateGetModel\n`);
});
