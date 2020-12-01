import 'mocha';

import { expect } from 'chai';

import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';
import { Tsoa } from '@tsoa/runtime';
import { ExtendedSpecConfig } from '@tsoa/cli/cli';

describe('Schema details generation', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/getController.ts').Generate();

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

  const contactInfo = spec.info.contact;
  if (!contactInfo) {
    throw new Error('No contact information.');
  }

  it('should set API license if provided', () => expect(licenseName).to.equal(getDefaultExtendedOptions().license));
  it('should set contact information if provided', () => expect(contactInfo).to.deep.equal(getDefaultExtendedOptions().contact));

  describe('@is[num] comment', () => {
    it("should generate model's schema type without comment name specify", () => {
      const metadata = new MetadataGenerator('./fixtures/controllers/tagController.ts').Generate();
      const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();

      if (spec.definitions === undefined) {
        throw new Error('No definitions find!');
      }

      // type: integer, format: int64 represents long.
      expect(spec.definitions.NumType.type).to.be.equal('integer');
      expect(spec.definitions.NumType.format).to.be.equal('int64');
    });

    it('should reject with orphan parameter jsdoc comment', () => {
      // Act
      let errToTest: Error | null = null;
      try {
        const invalidMetadata = new MetadataGenerator('./fixtures/controllers/invalidTagController.ts').Generate();
        new SpecGenerator2(invalidMetadata, getDefaultExtendedOptions()).GetSpec();
      } catch (err) {
        errToTest = err;
      }

      // Assert
      expect(errToTest!.message).to.match(/Orphan tag: @isInt should have a parameter name follows with./);
    });
  });

  describe('example comment', () => {
    it('should generate single example for model', () => {
      const metadata = new MetadataGenerator('./fixtures/controllers/exampleController.ts').Generate();
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

    describe('should generate single example for controller', () => {
      const metadata = new MetadataGenerator('./fixtures/controllers/exampleController.ts').Generate();
      const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();

      if (spec.paths === undefined) {
        throw new Error('No paths found!');
      }

      it('@Res parameters with 2 examples', () => {
        const responses = spec.paths['/ExampleTest/MultiResponseExamples'].get?.responses;

        expect(responses?.[400]?.examples?.['application/json']).to.eq(123);
      });
    });

    it('should reject with incorrect JSON-format jsdoc comment', () => {
      // Act
      let errToTest: Error | null = null;
      try {
        const invalidMetadata = new MetadataGenerator('./fixtures/controllers/invalidExampleController.ts').Generate();
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
        const metadataHiddenMethod = new MetadataGenerator('./fixtures/controllers/hiddenMethodController.ts').Generate();
        const specHiddenMethod = new SpecGenerator2(metadataHiddenMethod, getDefaultExtendedOptions()).GetSpec();

        expect(specHiddenMethod.paths).to.have.keys(['/Controller/normalGetMethod', '/Controller/hiddenQueryMethod']);
      });

      it('should not contain hidden query params', () => {
        const metadataHidden = new MetadataGenerator('./fixtures/controllers/hiddenMethodController.ts').Generate();
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
        const metadataHiddenController = new MetadataGenerator('./fixtures/controllers/hiddenController.ts').Generate();
        const specHiddenController = new SpecGenerator2(metadataHiddenController, getDefaultExtendedOptions()).GetSpec();

        expect(specHiddenController.paths).to.be.empty;
      });
    });

    describe('methods', () => {
      describe('responses', () => {
        it('should generate headers in reponse.', () => {
          const metadata = new MetadataGenerator('./fixtures/controllers/responseHeaderController.ts').Generate();
          const responseSpec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();
          const paths = ['SuccessResponseWithHeaderClass', 'SuccessResponseWithObject', 'ResponseWithHeaderClass', 'ResponseWithObject'];
          paths.forEach((path: string) => {
            const responses = responseSpec.paths[`/ResponseHeader/${path}`].get?.responses;

            expect(responses?.[200]?.headers).to.not.eq(undefined);
            if (path.includes('HeaderClass')) {
              expect(responses?.[200]?.headers).to.deep.eq({
                Link: {
                  type: 'string',
                  description: 'a link string',
                },
                LinkB: {
                  type: 'string',
                  description: 'b link str',
                },
              });
            }
          });
        });

        it('Falls back to the first @Example<>', () => {
          const metadata = new MetadataGenerator('./fixtures/controllers/exampleController.ts').Generate();
          const exampleSpec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();
          const responses = exampleSpec.paths['/ExampleTest/MultiResponseExamples'].get?.responses;

          expect(responses?.[200]?.examples?.['application/json']).to.eq('test 1');
        });
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
      const mixedEnumMetadata = new MetadataGenerator('./fixtures/controllers/mixedEnumController.ts').Generate();

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
    const metadata = new MetadataGenerator('./fixtures/controllers/methodController.ts').Generate();
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
