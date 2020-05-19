import 'mocha';

import { expect } from 'chai';

import { MetadataGenerator } from '../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '../../../src/swagger/specGenerator2';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';
import { Tsoa } from '../../../src/metadataGeneration/tsoa';
import { ExtendedSpecConfig } from '../../../src/cli';

describe('Schema details generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();

  const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();

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
    expect(spec.info.title).to.equal(getDefaultExtendedOptions().name);
  });
  it('should set API description if provided', () => {
    expect(spec.info.description).to.equal(getDefaultExtendedOptions().description);
  });
  it('should set API version if provided', () => {
    expect(spec.info.version).to.equal(getDefaultExtendedOptions().version);
  });
  it('should set API host if provided', () => {
    expect(spec.host).to.equal(getDefaultExtendedOptions().host);
  });
  it('should set API schemes if provided', () => {
    expect(spec.schemes).to.equal(getDefaultExtendedOptions().schemes);
  });

  const license = spec.info.license;
  if (!license) {
    throw new Error('No license.');
  }

  const licenseName = license.name;
  if (!licenseName) {
    throw new Error('No license name.');
  }

  it('should set API license if provided', () => expect(licenseName).to.equal(getDefaultExtendedOptions().license));

  describe('example comment', () => {
    it('should generate single example for model', () => {
      const metadata = new MetadataGenerator('./tests/fixtures/controllers/exampleController.ts').Generate();
      const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();

      if (spec.definitions === undefined) {
        throw new Error('No definitions find!');
      }

      // tslint:disable-next-line:no-string-literal
      const example = spec.definitions['Location'].example;
      expect(example).to.be.not.undefined;
      expect(example).to.deep.equal({
        contry: '123',
        city: '456',
      });
    });

    it('should generate single example for controller', () => {
      const metadata = new MetadataGenerator('./tests/fixtures/controllers/exampleController.ts').Generate();
      const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();

      if (spec.paths === undefined) {
        throw new Error('No paths find!');
      }

      it('@Path parameter in Get method', () => {
        const pathParams = spec.paths['/path/{path}'].parameters![0];
        expect(pathParams.examples).to.be.undefined;
        expect(pathParams.example).to.be.equal('an_example_path');
      });

      it('@Query parameter in Get method', () => {
        const queryParams = spec.paths['/query'].parameters![0];
        expect(queryParams.examples).to.be.undefined;
        expect(queryParams.example).to.be.equal('an_example_query');
      });

      it('@Header parameter in Get method', () => {
        const headerParams = spec.paths['/header'].parameters![0];
        expect(headerParams.examples).to.be.undefined;
        expect(headerParams.example).to.be.equal('aaaaaaLongCookie');
      });

      it('@Body parameter in Post method', () => {
        const postBodyParams = spec.paths['/post_body'].parameters![0];
        expect(postBodyParams.examples).to.be.undefined;
        expect(postBodyParams.example).to.deep.equal({
          contry: '1',
          city: '1',
        });
      });

      it('@BodyProp parameter in Post method', () => {
        const postBodyPropsParams = spec.paths['/two_parameter/{s}'].parameters![0];
        expect(postBodyPropsParams.examples).to.be.undefined;
        expect(postBodyPropsParams.example).to.deep.equal('prop1_1');
      });

      it('Two parameter with @Body and @Path in Post method', () => {
        const path = spec.paths['/two_parameter/{s}'];

        const bodyParams = path.parameters![0];
        expect(bodyParams.examples).to.be.undefined;
        expect(bodyParams.example).to.deep.equal({
          contry: '1',
          city: '1',
        });

        const pathParams = path.parameters![1];
        expect(pathParams.examples).to.be.undefined;
        expect(pathParams.example).to.be.equal('aa0');
      });

      it('Array with two @Body parameters in Post method', () => {
        // tslint:disable-next-line:no-string-literal
        const bodyParams = spec.paths['array_with_object'].parameters![0];
        expect(bodyParams.examples).to.be.undefined;
        expect(bodyParams.example).to.deep.equal([
          {
            contry: '1',
            city: '1',
          },
          {
            contry: '2',
            city: '2',
          },
        ]);
      });
    });

    it('should reject with incorrect JSON-format jsdoc comment', () => {
      // Act
      let errToTest: Error | null = null;
      try {
        const invalidMetadata = new MetadataGenerator('./tests/fixtures/controllers/invalidExampleController.ts').Generate();
        new SpecGenerator2(invalidMetadata, getDefaultExtendedOptions()).GetSpec();
      } catch (err) {
        errToTest = err;
      }

      // Assert
      expect(errToTest!.message).to.match(/JSON format is incorrect:/);
    });
  });

  describe('paths', () => {
    describe('hidden paths', () => {
      it('should not contain hidden paths', () => {
        const metadataHiddenMethod = new MetadataGenerator('./tests/fixtures/controllers/hiddenMethodController.ts').Generate();
        const specHiddenMethod = new SpecGenerator2(metadataHiddenMethod, getDefaultExtendedOptions()).GetSpec();

        expect(specHiddenMethod.paths).to.have.keys(['/Controller/normalGetMethod', '/Controller/hiddenQueryMethod']);
      });

      it('should not contain hidden query params', () => {
        const metadataHidden = new MetadataGenerator('./tests/fixtures/controllers/hiddenMethodController.ts').Generate();
        const specHidden = new SpecGenerator2(metadataHidden, getDefaultExtendedOptions()).GetSpec();

        if (!specHidden.paths) {
          throw new Error('Paths are not defined.');
        }
        if (!specHidden.paths['/Controller/hiddenQueryMethod']) {
          throw new Error('hiddenQueryMethod path not defined.');
        }
        if (!specHidden.paths['/Controller/hiddenQueryMethod'].get) {
          throw new Error('hiddenQueryMethod get method not defined.');
        }

        const method = specHidden.paths['/Controller/hiddenQueryMethod'].get;
        expect(method.parameters).to.have.lengthOf(1);

        const normalParam = method.parameters![0];
        expect(normalParam.in).to.equal('query');
        expect(normalParam.name).to.equal('normalParam');
        expect(normalParam.required).to.be.true;
        expect(normalParam.type).to.equal('string');
      });

      it('should not contain paths for hidden controller', () => {
        const metadataHiddenController = new MetadataGenerator('./tests/fixtures/controllers/hiddenController.ts').Generate();
        const specHiddenController = new SpecGenerator2(metadataHiddenController, getDefaultExtendedOptions()).GetSpec();

        expect(specHiddenController.paths).to.be.empty;
      });
    });
  });

  describe('illegal input values', () => {
    it('should not allow an enum that has anything other than string | number', () => {
      // Arrange
      const schemaName = 'tooManyTypesEnum';
      const metadataForEnums: Tsoa.Metadata = {
        controllers: [],
        referenceTypeMap: {
          [schemaName]: {
            refName: schemaName,
            dataType: 'refEnum',
            enums: [1, 'two', 3, 'four', ({} as unknown) as number],
          },
        },
      };
      const swaggerConfig: ExtendedSpecConfig = {
        outputDirectory: 'mockOutputDirectory',
        entryFile: 'mockEntryFile',
        noImplicitAdditionalProperties: 'ignore',
      };

      // Act
      let errToTest: Error | null = null;
      try {
        new SpecGenerator2(metadataForEnums, swaggerConfig).GetSpec();
      } catch (err) {
        errToTest = err;
      }

      // Assert
      expect(errToTest!.message).to.eq(`Enums can only have string or number values, but enum ${schemaName} had number,string,object`);
    });

    it('should throw if an enum is mixed with numbers and strings', () => {
      const swaggerConfig: ExtendedSpecConfig = {
        outputDirectory: 'mockOutputDirectory',
        entryFile: 'mockEntryFile',
        noImplicitAdditionalProperties: 'ignore',
      };
      const mixedEnumMetadata = new MetadataGenerator('./tests/fixtures/controllers/mixedEnumController.ts').Generate();

      // Act
      let errToTest: Error | null = null;
      try {
        new SpecGenerator2(mixedEnumMetadata, swaggerConfig).GetSpec();
      } catch (err) {
        errToTest = err;
      }

      // Assert
      expect(errToTest!.message).to.eq(`Enums can only have string or number values, but enum MixedStringAndNumberEnum had number,string`);
    });
  });

  describe('Extensions schema generation', () => {
    const metadata = new MetadataGenerator('./tests/fixtures/controllers/methodController').Generate();
    const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();

    if (!spec.paths) {
      throw new Error('No spec info.');
    }

    const extensionPath = spec.paths['/MethodTest/Extension'].get;

    if (!extensionPath) {
      throw new Error('extension method was not rendered');
    }

    // Verify that extensions are appeneded to the path
    expect(extensionPath).to.have.property('x-attKey');
    expect(extensionPath).to.have.property('x-attKey1');
    expect(extensionPath).to.have.property('x-attKey2');
    expect(extensionPath).to.have.property('x-attKey3');

    // Verify that extensions have correct values
    expect(extensionPath['x-attKey']).to.deep.equal('attValue');
    expect(extensionPath['x-attKey1']).to.deep.equal({ test: 'testVal' });
    expect(extensionPath['x-attKey2']).to.deep.equal(['y0', 'y1']);
    expect(extensionPath['x-attKey3']).to.deep.equal([{ y0: 'yt0', y1: 'yt1' }, { y2: 'yt2' }]);
  });
});
