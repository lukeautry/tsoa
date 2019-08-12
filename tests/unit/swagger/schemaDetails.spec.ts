import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator } from '../../../src/swagger/specGenerator';
import { getDefaultOptions } from '../../fixtures/defaultOptions';

describe('Schema details generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();

  if (!spec.info) { throw new Error('No spec info.'); }
  if (!spec.info.title) { throw new Error('No spec info title.'); }
  if (!spec.info.description) { throw new Error('No spec info description.'); }
  if (!spec.info.version) { throw new Error('No spec info version.'); }
  if (!spec.host) { throw new Error('No host'); }

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
  if (!license) { throw new Error('No license.'); }

  const licenseName = license.name;
  if (!licenseName) { throw new Error('No license name.'); }

  it('should set API license if provided', () => expect(licenseName).to.equal(getDefaultOptions().license));
});

describe('Custom Attribute schema generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/methodController').Generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();

  if (!spec.paths) { throw new Error('No spec info.'); }

  const customAttributePath = spec.paths['/MethodTest/CustomAttribute'].get;

  if (!customAttributePath) { throw new Error('customAttribute method was not rendered'); }

  // Verify that custom properties are appened to the path
  expect(customAttributePath).to.have.property('x-attKey');
  expect(customAttributePath).to.have.property('x-attKey1');
  expect(customAttributePath).to.have.property('x-attKey2');
  expect(customAttributePath).to.have.property('x-attKey3');

  // Verify that custom attributes have correct values
  expect(customAttributePath['x-attKey']).to.deep.equal('attValue');
  expect(customAttributePath['x-attKey1']).to.deep.equal({ test: 'testVal' });
  expect(customAttributePath['x-attKey2']).to.deep.equal(['y0', 'y1']);
  expect(customAttributePath['x-attKey3']).to.deep.equal([
    { y0: 'yt0',  y1: 'yt1' },
    { y2: 'yt2' },
  ]);

});
