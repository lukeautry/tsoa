import { expect } from 'chai';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';

it('should reject methods with same routes', () => {
  expect(() => {
    new MetadataGenerator('./fixtures/controllers/duplicateMethodsController.ts').Generate();
  }).to.throw(`Duplicate method signature @get(GetTest/Complex) found in controllers: DuplicateMethodsTestController#getModel, DuplicateMethodsTestController#duplicateGetModel\n`);
});
