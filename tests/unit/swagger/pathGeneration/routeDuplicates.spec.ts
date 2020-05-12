import { expect } from 'chai';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';

it('should reject methods with same routes', () => {
  expect(() => {
    new MetadataGenerator('./tests/fixtures/controllers/duplicateMethodsController.ts').Generate();
  }).to.throw(`Controller has methods with same routes: \n"@get(Complex)\ngetModel\n\n@get(Complex)\nduplicateGetModel".`);
});
