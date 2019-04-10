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

describe('Inherited method schema generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/inheritanceMethodController').Generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();

  if (!spec.paths) { throw new Error('No spec info.'); }

  console.log(JSON.stringify(spec))

  it('should have inherited methods', () => {
    expect(spec.paths).to.have.property('/InheritedMethodTest/Base');
    expect(spec.paths).to.have.property('/InheritedMethodTest/Post');
    expect(spec.paths).to.have.property('/InheritedMethodTest/SuperBasePatch');
  });

  const overwrittenPath = spec.paths['/InheritedMethodTest/OverwrittenMethod'];

  if (!overwrittenPath) { throw new Error('InheritedMethodTest path does not exist'); }
  if (!overwrittenPath.put) { throw new Error('InheritedMethodTest put path does not exist'); }
  if (!overwrittenPath.put.operationId) { throw new Error('InheritedMethodTest put operationId path does not exist'); }

  it('children should overwrite their inherited methods', () => {
    expect(spec.paths).to.have.property('/InheritedMethodTest/OverwrittenMethod');
    expect(overwrittenPath).to.have.property('put');
    expect(overwrittenPath.put).to.have.property('operationId');
    expect(overwrittenPath.put.operationId).to.not.equal('ThisMethodShouldBeOverwritten');
  });
});
