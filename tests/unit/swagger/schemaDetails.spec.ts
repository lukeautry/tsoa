import 'mocha';
import {MetadataGenerator} from '../../../src/metadataGeneration/metadataGenerator';
import {SpecGenerator} from '../../../src/swagger/specGenerator';
import {getDefaultOptions} from '../../fixtures/defaultOptions';
import * as chai from 'chai';

const expect = chai.expect;

describe('Schema details generation', () => {
    const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();
    const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();

    it('should set API name if provided', () => expect(spec.info.title).to.equal(getDefaultOptions().name));
    it('should set API description if provided', () => expect(spec.info.description).to.equal(getDefaultOptions().description));
    it('should set API version if provided', () => expect(spec.info.version).to.equal(getDefaultOptions().version));
    it('should set API host if provided', () => expect(spec.host).to.equal(getDefaultOptions().host));
    it('should set API host if provided', () => expect(spec.info.license.name).to.equal(getDefaultOptions().license));
});
