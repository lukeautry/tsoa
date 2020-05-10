import { expect } from 'chai';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '../../../../src/swagger/specGenerator2';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';

it('should reject methods with same routes', () => {
  expect(() => {
    const invalidMetadata = new MetadataGenerator('./tests/fixtures/controllers/duplicateMethodsController.ts').Generate();
    new SpecGenerator2(invalidMetadata, getDefaultExtendedOptions()).GetSpec();
  }).to.throw(`Controller has methods with same routes: "\n@get(Complex)\ngetModel\n\n@get(Complex)\nduplicateGetModel".`);
});
