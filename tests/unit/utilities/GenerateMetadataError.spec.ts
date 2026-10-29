import { expect } from 'chai';
import 'mocha';
import { GenerateMetadataError } from '@tsoa/cli/metadataGeneration/exceptions';

describe('GenerateMetadataError', () => {
  it(`Should have a given text`, () => {
    expect(new GenerateMetadataError('Text').message).to.eq('Text');
  });
});
