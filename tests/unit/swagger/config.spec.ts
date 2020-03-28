import { expect } from 'chai';
import 'mocha';
import { validateSwaggerConfig } from '../../../src/cli';
import { Config, SwaggerConfig } from '../../../src/config';
import { validateMutualConfigs } from '../../../src/utils/mutualConfigValidation';
import { getDefaultOptions } from '../../fixtures/defaultOptions';

describe('Configuration', () => {
  describe('.validateSwaggerConfig', () => {
    it('should reject when outputDirectory is not set', done => {
      const config: SwaggerConfig = getDefaultOptions();
      validateSwaggerConfig(config).then(
        result => {
          throw new Error('Should not get here, expecting error regarding outputDirectory');
        },
        err => {
          expect(err.message).to.equal('Missing outputDirectory: configuration must contain output directory.');
          done();
        },
      );
    });

    it('should reject when entryFile is not set', done => {
      const config: SwaggerConfig = getDefaultOptions('some/output/directory');
      validateSwaggerConfig(config).then(
        result => {
          throw new Error('Should not get here, expecting error regarding entryFile');
        },
        err => {
          expect(err.message).to.equal('Missing entryFile: Configuration must contain an entry point file.');
          done();
        },
      );
    });

    it('should set the default API version', done => {
      const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json');
      validateSwaggerConfig(config).then((configResult: SwaggerConfig) => {
        expect(configResult.version).to.equal('1.0.0');
        done();
      });
    });

    it('should set the default Spec version 2 when not specified', done => {
      const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json');
      validateSwaggerConfig(config).then((configResult: SwaggerConfig) => {
        expect(configResult.specVersion).to.equal(2);
        done();
      });
    });

    it('should reject an unsupported Spec version', done => {
      const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json');
      // Do any cast to ignore compile error due to Swagger.SupportedSpecVersion not supporting -2
      config.specVersion = -2 as any;
      validateSwaggerConfig(config).then(
        (configResult: SwaggerConfig) => {
          throw new Error('Should not get here, expecting error regarding unsupported Spec version');
        },
        err => {
          expect(err.message).to.equal('Unsupported Spec version.');
          done();
        },
      );
    });

    it('should accept Spec version 3 when specified', done => {
      const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json');
      config.specVersion = 3;
      validateSwaggerConfig(config).then((configResult: SwaggerConfig) => {
        expect(configResult.specVersion).to.equal(3);
        done();
      });
    });
    it('should accept multiple hosts in open api 3', done => {
      const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json');
      // Do any cast to ignore compile error due to Swagger.SupportedSpecVersion not supporting -2
      config.specVersion = 3 as any;
      config.hosts = ['https://localhost:3000', 'https://localhost:3002'];
      validateSwaggerConfig(config).then(
        (configResult: SwaggerConfig) => {
          expect(configResult).to.be.ok;
          done();
        },
        err => {
          throw new Error('Should not get here, expecting valid configs');
        },
      );
    });
    it('should not allow host, schema', done => {
      const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json', 3);
      // Do any cast to ignore compile error due to Swagger.SupportedSpecVersion not supporting -2
      config.specVersion = 3 as any;
      config.host = 'localhost:3000';
      config.schemes = ['http'];
      validateSwaggerConfig(config).then(
        (configResult: SwaggerConfig) => {
          expect(configResult).to.not.be.ok;
        },
        err => {
          expect(err).to.be.ok;
        },
      );
      config.hosts = [];
      validateSwaggerConfig(config).then(
        (configResult: SwaggerConfig) => {
          expect(configResult).to.be.ok;
          done();
        },
        err => {
          throw new Error('Should not get here, expecting valid configs');
        },
      );
    });
    it('should set a default hosts when none are provided in open api 3', done => {
      const config: SwaggerConfig = getDefaultOptions('some/output/directory', 'tsoa.json', 3);
      // Do any cast to ignore compile error due to Swagger.SupportedSpecVersion not supporting -2
      config.specVersion = 3 as any;
      validateSwaggerConfig(config).then(
        (configResult: SwaggerConfig) => {
          expect(configResult).to.be.ok;
        },
        err => {
          throw new Error('Should not get here, expecting valid configs');
        },
      );
      config.hosts = [];
      validateSwaggerConfig(config).then(
        (configResult: SwaggerConfig) => {
          expect(configResult).to.be.ok;
          done();
        },
        err => {
          throw new Error('Should not get here, expecting valid configs');
        },
      );
    });
  });

  describe('.validateMutualConfigs', () => {
    it('should throw if config.routes.controllerPathGlobs in an empty array', () => {
      // Arrange
      const config: Config = {
        routes: {
          controllerPathGlobs: [],
        },
        swagger: {},
      } as any;
      const expectedError = 'controllerPathGlobs must include at least one glob string';

      // tslint:disable-next-line: no-unnecessary-initializer
      let errToValidate: Error | undefined = undefined;
      try {
        validateMutualConfigs(config.routes, config.swagger);
      } catch (err) {
        errToValidate = err;
      }
      if (!errToValidate) {
        throw new Error(`We expected to get a failure but we did not. Expected error was ${expectedError}`);
      }
      expect(errToValidate.message).to.equal(expectedError);
    });

    it('should throw if config.swagger.controllerPathGlobs in an empty array', () => {
      // Arrange
      const config: Config = {
        routes: {},
        swagger: {
          controllerPathGlobs: [],
        },
      } as any;
      const expectedError = 'controllerPathGlobs must include at least one glob string';

      // tslint:disable-next-line: no-unnecessary-initializer
      let errToValidate: Error | undefined = undefined;
      try {
        validateMutualConfigs(config.routes, config.swagger);
      } catch (err) {
        errToValidate = err;
      }
      if (!errToValidate) {
        throw new Error(`We expected to get a failure but we did not. Expected error was ${expectedError}`);
      }
      expect(errToValidate.message).to.equal(expectedError);
    });

    it('should throw if config.routes.controllerPathGlobs has empty strings', () => {
      // Arrange
      const config: Config = {
        routes: {
          controllerPathGlobs: [],
        },
        swagger: {},
      } as any;
      const expectedError = `controllerPathGlobs must include at least one glob string`;

      // tslint:disable-next-line: no-unnecessary-initializer
      let errToValidate: Error | undefined = undefined;
      try {
        validateMutualConfigs(config.routes, config.swagger);
      } catch (err) {
        errToValidate = err;
      }
      if (!errToValidate) {
        throw new Error(`We expected to get a failure but we did not. Expected error was ${expectedError}`);
      }
      expect(errToValidate.message).to.equal(expectedError);
    });

    it('should throw if config.swagger.controllerPathGlobs has empty strings', () => {
      // Arrange
      const config: Config = {
        routes: {},
        swagger: {
          controllerPathGlobs: [''],
        },
      } as any;
      const expectedError = `Found a value () that is not a valid glob for controllerPathGlobs`;

      // tslint:disable-next-line: no-unnecessary-initializer
      let errToValidate: Error | undefined = undefined;
      try {
        validateMutualConfigs(config.routes, config.swagger);
      } catch (err) {
        errToValidate = err;
      }
      if (!errToValidate) {
        throw new Error(`We expected to get a failure but we did not. Expected error was ${expectedError}`);
      }
      expect(errToValidate.message).to.equal(expectedError);
    });

    it('should throw if both controllerPathGlobs values do not match', () => {
      // Arrange
      const config: Config = {
        routes: {
          controllerPathGlobs: ['directory1/**/*'],
        },
        swagger: {
          controllerPathGlobs: ['directory2/**'],
        },
      } as any;
      const expectedError = `You do not have to pass controllerPathGlobs for both SwaggerConfig and RoutesConfig; but if you do, then they must have the same values. Current they differ.`;

      // tslint:disable-next-line: no-unnecessary-initializer
      let errToValidate: Error | undefined = undefined;
      try {
        validateMutualConfigs(config.routes, config.swagger);
      } catch (err) {
        errToValidate = err;
      }
      if (!errToValidate) {
        throw new Error(`We expected to get a failure but we did not. Expected error was ${expectedError}`);
      }
      expect(errToValidate.message).to.equal(expectedError);
    });
  });
});
