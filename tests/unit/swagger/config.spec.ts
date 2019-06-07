import { expect } from 'chai';
import 'mocha';
import { validateSwaggerConfig } from '../../../src/cli';
import { SwaggerConfig } from '../../../src/config';
import { getDefaultOptions } from '../../fixtures/defaultOptions';

describe('Configuration', () => {

  it('should reject when outputDirectory is not set', (done) => {

    const config: SwaggerConfig = getDefaultOptions();
    validateSwaggerConfig(config).then((result) => {
      throw new Error('Should not get here, expecting error regarding outputDirectory');
    }, (err) => {
      expect(err.message).to.equal('Missing outputDirectory: configuration most contain output directory.');
      done();
    });

  });

  it('should reject when entryFile is not set', (done) => {

    const config: SwaggerConfig = getDefaultOptions('some/output/directory');
    validateSwaggerConfig(config).then((result) => {
      throw new Error('Should not get here, expecting error regarding entryFile');
    }, (err) => {
      expect(err.message).to.equal('Missing entryFile: Configuration must contain an entry point file.');
      done();
    });

  });

  it('should set the default API version', (done) => {

    const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json');
    validateSwaggerConfig(config).then((configResult: SwaggerConfig) => {
      expect(configResult.version).to.equal('1.0.0');
      done();
    });

  });

  it('should set the default Spec version 2 when not specified', (done) => {

    const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json');
    validateSwaggerConfig(config).then((configResult: SwaggerConfig) => {
      expect(configResult.specVersion).to.equal(2);
      done();
    });

  });

  it('should reject an unsupported Spec version', (done) => {

    const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json');
    // Do any cast to ignore compile error due to Swagger.SupportedSpecVersion not supporting -2
    config.specVersion = -2 as any;
    validateSwaggerConfig(config).then((configResult: SwaggerConfig) => {
      throw new Error('Should not get here, expecting error regarding unsupported Spec version');
    }, (err) => {
      expect(err.message).to.equal('Unsupported Spec version.');
      done();
    });

  });

  it('should accept Spec version 3 when specified', (done) => {

    const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json');
    config.specVersion = 3;
    validateSwaggerConfig(config).then((configResult: SwaggerConfig) => {
      expect(configResult.specVersion).to.equal(3);
      done();
    });

  });

});
