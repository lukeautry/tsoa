/// <reference path="../../../typings/index.d.ts" />
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

    it('should fall back to package.json name for API name', () => {
        const defaultOptions = getDefaultOptions();
        defaultOptions.name = undefined;

        const localSpec = new SpecGenerator(metadata, defaultOptions).GetSpec();
        expect(localSpec.info.title).to.equal(process.env.npm_package_name);
    });

    it('should fall back to package.json name for API version', () => {
        const defaultOptions = getDefaultOptions();
        defaultOptions.version = undefined;

        const localSpec = new SpecGenerator(metadata, defaultOptions).GetSpec();
        expect(localSpec.info.version).to.equal(process.env.npm_package_version);
    });

    it('should fall back to package.json name for API name', () => {
        const defaultOptions = getDefaultOptions();
        defaultOptions.description = undefined;

        const localSpec = new SpecGenerator(metadata, defaultOptions).GetSpec();
        expect(localSpec.info.description).to.equal(process.env.npm_package_description);
    });
});
