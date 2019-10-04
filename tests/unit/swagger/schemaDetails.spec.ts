import 'mocha';

import { expect } from 'chai';

import { MetadataGenerator } from '../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '../../../src/swagger/specGenerator2';
import { getDefaultOptions } from '../../fixtures/defaultOptions';

describe('Schema details generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();

  const spec = new SpecGenerator2(metadata, getDefaultOptions()).GetSpec();

  if (!spec.info) {
    throw new Error('No spec info.');
  }
  if (!spec.info.title) {
    throw new Error('No spec info title.');
  }
  if (!spec.info.description) {
    throw new Error('No spec info description.');
  }
  if (!spec.info.version) {
    throw new Error('No spec info version.');
  }
  if (!spec.host) {
    throw new Error('No host');
  }

  it('should set API name if provided', () => {
    expect(spec.info.title).to.equal(getDefaultOptions().name);
  });
  it('should set API description if provided', () => {
    expect(spec.info.description).to.equal(getDefaultOptions().description);
  });
  it('should set API version if provided', () => {
    expect(spec.info.version).to.equal(getDefaultOptions().version);
  });
  it('should set API host if provided', () => {
    expect(spec.host).to.equal(getDefaultOptions().host);
  });
  it('should set API schemes if provided', () => {
    expect(spec.schemes).to.equal(getDefaultOptions().schemes);
  });

  const license = spec.info.license;
  if (!license) {
    throw new Error('No license.');
  }

  const licenseName = license.name;
  if (!licenseName) {
    throw new Error('No license name.');
  }

  it('should set API license if provided', () => expect(licenseName).to.equal(getDefaultOptions().license));

  describe('paths', () => {
    describe('hidden paths', () => {
      it('should not contain hidden paths', () => {
        const metadataHiddenMethod = new MetadataGenerator('./tests/fixtures/controllers/hiddenMethodController.ts').Generate();
        const specHiddenMethod = new SpecGenerator2(metadataHiddenMethod, getDefaultOptions()).GetSpec();

        expect(specHiddenMethod.paths).to.have.keys(['/Controller/normalGetMethod']);
      });

      it('should not contain paths for hidden controller', () => {
        const metadataHiddenController = new MetadataGenerator('./tests/fixtures/controllers/hiddenController.ts').Generate();
        const specHiddenController = new SpecGenerator2(metadataHiddenController, getDefaultOptions()).GetSpec();

        expect(specHiddenController.paths).to.be.empty;
      });
    });
  });
});
