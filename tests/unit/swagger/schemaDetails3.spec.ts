import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { Tsoa } from '@tsoa/runtime';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger } from '@tsoa/runtime';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';
import { TestModel } from '../../fixtures/testModel';
import { ExtendedSpecConfig } from '@tsoa/cli/cli';

describe('Definition generation for OpenAPI 3.0.0', () => {
  const metadataGet = new MetadataGenerator('./fixtures/controllers/getController.ts').Generate();
  const metadataPost = new MetadataGenerator('./fixtures/controllers/postController.ts').Generate();

  const defaultOptions: ExtendedSpecConfig = getDefaultExtendedOptions();
  const optionsWithNoAdditional = Object.assign<{}, ExtendedSpecConfig, Partial<ExtendedSpecConfig>>({}, defaultOptions, {
    noImplicitAdditionalProperties: 'silently-remove-extras',
  });
  const optionsWithXEnumVarnames = Object.assign<{}, ExtendedSpecConfig, Partial<ExtendedSpecConfig>>({}, defaultOptions, {
    xEnumVarnames: true,
  });

  interface SpecAndName {
    spec: Swagger.Spec3;
    /**
     * If you want to add another spec here go for it. The reason why we use a string literal is so that tests below won't have "magic string" errors when expected test results differ based on the name of the spec you're testing.
     */
    specName: 'specDefault' | 'specWithNoImplicitExtras' | 'specWithXEnumVarnames';
  }

  const specDefault: SpecAndName = {
    spec: new SpecGenerator3(metadataGet, defaultOptions).GetSpec(),
    specName: 'specDefault',
  };
  const specWithNoImplicitExtras: SpecAndName = {
    spec: new SpecGenerator3(metadataGet, optionsWithNoAdditional).GetSpec(),
    specName: 'specWithNoImplicitExtras',
  };
  const specWithXEnumVarnames: SpecAndName = {
    spec: new SpecGenerator3(metadataGet, optionsWithXEnumVarnames).GetSpec(),
    specName: 'specWithXEnumVarnames',
  };

  const getComponentSchema = (name: string, chosenSpec: SpecAndName) => {
    if (!chosenSpec.spec.components.schemas) {
      throw new Error(`No schemas were generated for ${chosenSpec.specName}.`);
    }

    const schema = chosenSpec.spec.components.schemas[name];

    if (!schema) {
      throw new Error(`${name} should have been automatically generated in ${chosenSpec.specName}.`);
    }

    return schema;
  };

  /**
   * This allows us to iterate over specs that have different options to ensure that certain behavior is consistent
   */
  const allSpecs: SpecAndName[] = [specDefault, specWithNoImplicitExtras];

  function forSpec(chosenSpec: SpecAndName): string {
    return `for the ${chosenSpec.specName} spec`;
  }

  describe('tags', () => {
    it('should generate a valid tags array', () => {
      expect(specDefault.spec.tags).to.deep.equal([{ name: 'hello', description: 'Endpoints related to greeting functionality' }]);
    });
  });

  describe('servers', () => {
    it('should replace the parent schemes element', () => {
      expect(specDefault.spec).to.not.have.property('schemes');
      expect(specDefault.spec.servers[0].url).to.match(/^https/);
    });

    it('should replace the parent host element', () => {
      expect(specDefault.spec).to.not.have.property('host');
      expect(specDefault.spec.servers[0].url).to.match(/localhost:3000/);
    });

    it('should replace the parent basePath element', () => {
      expect(specDefault.spec).to.not.have.property('basePath');
      expect(specDefault.spec.servers[0].url).to.match(/\/v1/);
    });

    it('should have relative URL when no host is defined', () => {
      const optionsWithNoHost = Object.assign<{}, ExtendedSpecConfig>({}, defaultOptions);
      delete optionsWithNoHost.host;

      const spec: Swagger.Spec3 = new SpecGenerator3(metadataGet, optionsWithNoHost).GetSpec();
      expect(spec.servers[0].url).to.equal('/v1');
    });
  });

  describe('info', () => {
    it('should generate a valid info object', () => {
      expect(specDefault.spec.info).to.deep.equal({
        title: 'Test API',
        description: 'Description of a test API',
        contact: { email: 'jane@doe.com', name: 'Jane Doe', url: 'www.jane-doe.com' },
        license: { name: 'MIT' },
        version: '1.0.0',
      });
    });
  });

  describe('security', () => {
    it('should replace the parent securityDefinitions with securitySchemes within components', () => {
      expect(specDefault.spec).to.not.have.property('securityDefinitions');
      expect(specDefault.spec.components.securitySchemes).to.be.ok;
    });

    it('should replace type: basic with type: http and scheme: basic', () => {
      if (!specDefault.spec.components.securitySchemes) {
        throw new Error('No security schemes.');
      }
      if (!specDefault.spec.components.securitySchemes.basic) {
        throw new Error('No basic security scheme.');
      }

      const basic = specDefault.spec.components.securitySchemes.basic as Swagger.BasicSecurity3;

      expect(basic.type).to.equal('http');
      expect(basic.scheme).to.equal('basic');
    });

    it('should replace type: oauth2 with type password: oauth2 and flows with password', () => {
      if (!specDefault.spec.components.securitySchemes) {
        throw new Error('No security schemes.');
      }
      if (!specDefault.spec.components.securitySchemes.password) {
        throw new Error('No basic security scheme.');
      }

      const password = specDefault.spec.components.securitySchemes.password as Swagger.OAuth2Security3;

      expect(password.type).to.equal('oauth2');
      expect(password.flows.password).exist;

      const flow = password.flows.password;

      if (!flow) {
        throw new Error('No password flow.');
      }

      expect(flow.tokenUrl).to.equal('/ats-api/auth/token');
      expect(flow.authorizationUrl).to.be.undefined;

      expect(flow.scopes).to.eql({
        user_read: 'user read',
        user_write: 'user_write',
      });
    });

    it('should replace type: oauth2 with type application: oauth2 and flows with clientCredentials', () => {
      if (!specDefault.spec.components.securitySchemes) {
        throw new Error('No security schemes.');
      }
      if (!specDefault.spec.components.securitySchemes.application) {
        throw new Error('No basic security scheme.');
      }

      const app = specDefault.spec.components.securitySchemes.application as Swagger.OAuth2Security3;

      expect(app.type).to.equal('oauth2');
      expect(app.flows.clientCredentials).exist;

      const flow = app.flows.clientCredentials;

      if (!flow) {
        throw new Error('No clientCredentials flow.');
      }

      expect(flow.tokenUrl).to.equal('/ats-api/auth/token');
      expect(flow.authorizationUrl).to.be.undefined;

      expect(flow.scopes).to.eql({
        user_read: 'user read',
        user_write: 'user_write',
      });
    });

    it('should replace type: oauth2 with type accessCode: oauth2 and flows with authorizationCode', () => {
      if (!specDefault.spec.components.securitySchemes) {
        throw new Error('No security schemes.');
      }
      if (!specDefault.spec.components.securitySchemes.accessCode) {
        throw new Error('No basic security scheme.');
      }

      const authCode = specDefault.spec.components.securitySchemes.accessCode as Swagger.OAuth2Security3;

      expect(authCode.type).to.equal('oauth2');
      expect(authCode.flows.authorizationCode).exist;

      const flow = authCode.flows.authorizationCode;

      if (!flow) {
        throw new Error('No authorizationCode flow.');
      }

      expect(flow.tokenUrl).to.equal('/ats-api/auth/token');
      expect(flow.authorizationUrl).to.equal('/ats-api/auth/authorization');

      expect(flow.scopes).to.eql({
        user_read: 'user read',
        user_write: 'user_write',
      });
    });

    it('should replace type: oauth2 with type implicit: oauth2 and flows with implicit', () => {
      if (!specDefault.spec.components.securitySchemes) {
        throw new Error('No security schemes.');
      }
      if (!specDefault.spec.components.securitySchemes.implicit) {
        throw new Error('No basic security scheme.');
      }

      const imp = specDefault.spec.components.securitySchemes.implicit as Swagger.OAuth2Security3;

      expect(imp.type).to.equal('oauth2');
      expect(imp.flows.implicit).exist;

      const flow = imp.flows.implicit;

      if (!flow) {
        throw new Error('No implicit flow.');
      }

      expect(flow.tokenUrl).to.be.undefined;
      expect(flow.authorizationUrl).to.equal('/ats-api/auth/authorization');

      expect(flow.scopes).to.eql({
        user_read: 'user read',
        user_write: 'user_write',
      });
    });
  });

  describe('example comment', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/exampleController.ts').Generate();
    const exampleSpec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();

    it('should generate single example for model', () => {
      if (exampleSpec.components === undefined) {
        throw new Error('No components find!');
      }
      if (exampleSpec.components.schemas === undefined) {
        throw new Error('No schemas find!');
      }

      const example = exampleSpec.components.schemas?.Location.example;
      expect(example).to.be.not.undefined;
      expect(example).to.deep.equal({
        contry: '123',
        city: '456',
      });
    });

    describe('should generate multiple example for Parameters', () => {
      it('@Path parameter in Get method', () => {
        const pathParams = exampleSpec.paths['/ExampleTest/path/{path}'].get!.parameters![0];
        expect(pathParams.example).to.be.undefined;
        expect(pathParams.examples).to.deep.equal({ 'Example 1': { value: 'an_example_path' }, 'Example 2': { value: 'an_example_path2' } });
      });

      it('@Query parameter in Get method', () => {
        const queryParams = exampleSpec.paths['/ExampleTest/query'].get!.parameters![0];
        expect(queryParams.example).to.be.undefined;
        expect(queryParams.examples).to.deep.equal({ 'Example 1': { value: 'an_example_query' }, 'Example 2': { value: 'an_example_query2' } });
      });

      it('@Header parameter in Get method', () => {
        const headerParams = exampleSpec.paths['/ExampleTest/header'].get!.parameters![0];
        expect(headerParams.example).to.be.undefined;
        expect(headerParams.examples).to.deep.equal({ 'Example 1': { value: 'aaaaaaLongCookie' }, 'Example 2': { value: 'aaaaaaLongCookie2' } });
      });

      it('@Body parameter in Post method', () => {
        const postBodyParams = exampleSpec.paths['/ExampleTest/post_body'].post?.requestBody?.content?.['application/json'];
        expect(postBodyParams?.example).to.be.undefined;
        expect(postBodyParams?.examples).to.deep.equal({
          'Example 1': {
            value: {
              contry: '1',
              city: '1',
            },
          },
          'Example 2': {
            value: {
              contry: '2',
              city: '2',
            },
          },
        });
      });

      it('Two parameter with @Body and @Path in Post method', () => {
        const path = exampleSpec.paths['/ExampleTest/two_parameter/{s}'].post!;

        const bodyParams = path.requestBody?.content?.['application/json'];
        expect(bodyParams?.example).to.be.undefined;
        expect(bodyParams?.examples).to.deep.equal({
          'Example 1': {
            value: {
              contry: '1',
              city: '1',
            },
          },
          'Example 2': {
            value: {
              contry: '2',
              city: '2',
            },
          },
        });

        const pathParams = path.parameters![0];
        expect(pathParams?.example).to.be.undefined;
        expect(pathParams?.examples).to.deep.equal({ 'Example 1': { value: 'aa0' }, 'Example 2': { value: 'aa1' }, 'Example 3': { value: 'aa2' } });
      });

      it('Array with two @Body parameters in Post method', () => {
        const bodyParams = exampleSpec.paths['/ExampleTest/array_with_object'].post?.requestBody?.content?.['application/json'];
        expect(bodyParams?.example).to.be.undefined;
        expect(bodyParams?.examples).to.deep.equal({
          'Example 1': {
            value: [
              {
                contry: '1',
                city: '1',
              },
              {
                contry: '2',
                city: '2',
              },
            ],
          },
          'Example 2': {
            value: [
              {
                contry: '22',
                city: '22',
              },
              {
                contry: '33',
                city: '33',
              },
            ],
          },
        });
      });
    });
  });

  describe('paths', () => {
    describe('uploadedFiles', () => {
      /**
       * Tests according to openapi v3 specs
       * @link http://spec.openapis.org/oas/v3.0.0
       * Validated and tested GUI with swagger.io
       * @link https://editor.swagger.io/
       */
      it('should have requestBody with single multipart/form-data', () => {
        // Act
        const specPost = new SpecGenerator3(metadataPost, getDefaultExtendedOptions()).GetSpec();
        const pathPost = specPost.paths['/PostTest/File'].post;
        if (!pathPost) {
          throw new Error('PostTest file method not defined');
        }
        if (!pathPost.requestBody) {
          throw new Error('PostTest file method has no requestBody');
        }

        // Assert
        expect(pathPost.parameters).to.have.length(0);
        expect(pathPost.requestBody).to.deep.equal({
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  someFile: {
                    type: 'string',
                    format: 'binary',
                  },
                },
                required: ['someFile'],
              },
            },
          },
        });
      });
      it('should consume multipart/form-data and have formData parameter with no name', () => {
        // Act
        const specPost = new SpecGenerator3(metadataPost, getDefaultExtendedOptions()).GetSpec();
        const pathPost = specPost.paths['/PostTest/FileWithoutName'].post;
        if (!pathPost) {
          throw new Error('PostTest file method not defined');
        }
        if (!pathPost.requestBody) {
          throw new Error('PostTest file method has no requestBody');
        }

        // Assert
        expect(pathPost.parameters).to.have.length(0);
        expect(pathPost.requestBody).to.deep.equal({
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  aFile: {
                    type: 'string',
                    format: 'binary',
                  },
                },
                required: ['aFile'],
              },
            },
          },
        });
      });
      it('should consume multipart/form-data and have multiple formData parameter', () => {
        // Act
        const specPost = new SpecGenerator3(metadataPost, getDefaultExtendedOptions()).GetSpec();
        const pathPost = specPost.paths['/PostTest/ManyFilesAndFormFields'].post;
        if (!pathPost) {
          throw new Error('PostTest file method not defined');
        }
        if (!pathPost.requestBody) {
          throw new Error('PostTest file method has no requestBody');
        }

        // Assert
        expect(pathPost.parameters).to.have.length(0);
        expect(pathPost.requestBody).to.deep.equal({
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  someFiles: {
                    type: 'array',
                    items: {
                      type: 'string',
                      format: 'binary',
                    },
                  },
                  a: {
                    type: 'string',
                  },
                  c: {
                    type: 'string',
                  },
                },
                required: ['someFiles', 'a', 'c'],
              },
            },
          },
        });
      });
      it('should not treat optional file as required', () => {
        // Act
        const specPost = new SpecGenerator3(metadataPost, getDefaultExtendedOptions()).GetSpec();
        const pathPost = specPost.paths['/PostTest/FileOptional'].post;
        if (!pathPost) {
          throw new Error('PostTest file method not defined');
        }
        if (!pathPost.requestBody) {
          throw new Error('PostTest file method has no requestBody');
        }

        // Assert
        expect(pathPost.parameters).to.have.length(0);
        expect(pathPost.requestBody).to.deep.equal({
          required: false,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  optionalFile: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
          },
        });
      });
    });
    describe('requestBody', () => {
      it('should replace the body parameter with a requestBody', () => {
        const specPost = new SpecGenerator3(metadataPost, JSON.parse(JSON.stringify(defaultOptions))).GetSpec();

        if (!specPost.paths) {
          throw new Error('Paths are not defined.');
        }
        if (!specPost.paths['/PostTest']) {
          throw new Error('PostTest path not defined.');
        }
        if (!specPost.paths['/PostTest'].post) {
          throw new Error('PostTest post method not defined.');
        }

        const method = specPost.paths['/PostTest'].post;

        if (!method || !method.parameters) {
          throw new Error('Parameters not defined.');
        }

        expect(method.parameters).to.deep.equal([]);

        if (!method.requestBody) {
          throw new Error('Request body not defined.');
        }

        expect(method.requestBody.content['application/json'].schema).to.deep.equal({
          $ref: '#/components/schemas/TestModel',
        });
      });
    });
    describe('hidden paths', () => {
      it('should not contain hidden paths', () => {
        const metadataHiddenMethod = new MetadataGenerator('./fixtures/controllers/hiddenMethodController.ts').Generate();
        const specHiddenMethod = new SpecGenerator3(metadataHiddenMethod, JSON.parse(JSON.stringify(defaultOptions))).GetSpec();

        expect(specHiddenMethod.paths).to.have.keys(['/Controller/normalGetMethod', '/Controller/hiddenQueryMethod']);
      });

      it('should not contain hidden query params', () => {
        const metadataHidden = new MetadataGenerator('./fixtures/controllers/hiddenMethodController.ts').Generate();
        const specHidden = new SpecGenerator3(metadataHidden, JSON.parse(JSON.stringify(defaultOptions))).GetSpec();

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
        expect(normalParam.schema.type).to.equal('string');
      });

      it('should not contain paths for hidden controller', () => {
        const metadataHiddenController = new MetadataGenerator('./fixtures/controllers/hiddenController.ts').Generate();
        const specHiddenController = new SpecGenerator3(metadataHiddenController, JSON.parse(JSON.stringify(defaultOptions))).GetSpec();

        expect(specHiddenController.paths).to.be.empty;
      });
    });

    describe('methods', () => {
      describe('responses', () => {
        describe('should generate headers from method reponse decorator.', () => {
          const metadata = new MetadataGenerator('./fixtures/controllers/responseHeaderController.ts').Generate();
          const responseSpec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();

          it('proper schema ref for header class.', () => {
            const pathsWithHeaderClass = ['SuccessResponseWithHeaderClass', 'ResponseWithHeaderClass', 'TsoaResponseWithHeaderClass'];
            pathsWithHeaderClass.forEach((path: string) => {
              const responses = responseSpec.paths[`/ResponseHeader/${path}`].get?.responses;
              expect(responses?.[200]?.headers?.ResponseHeader).to.deep.eq({
                schema: {
                  $ref: '#/components/schemas/ResponseHeader',
                },
                description: "response header's description",
              });
            });
          });
          it('with header object.', () => {
            expect(responseSpec.paths['/ResponseHeader/SuccessResponseWithObject'].get?.responses?.[200]?.headers).to.deep.eq({
              linkA: {
                required: true,
                schema: { type: 'string' },
                description: undefined,
              },
              linkB: {
                required: true,
                schema: { type: 'array', items: { type: 'string' } },
                description: undefined,
              },
              linkOpt: {
                required: false,
                schema: { type: 'string' },
                description: undefined,
              },
            });
            expect(responseSpec.paths['/ResponseHeader/ResponseWithObject'].get?.responses?.[200]?.headers).to.deep.eq({
              linkC: {
                required: true,
                schema: { type: 'string' },
                description: undefined,
              },
              linkD: {
                required: true,
                schema: { type: 'array', items: { type: 'string' } },
                description: undefined,
              },
              linkOpt: {
                required: false,
                schema: { type: 'string' },
                description: undefined,
              },
            });
            expect(responseSpec.paths['/ResponseHeader/TsoaResponseWithObject'].get?.responses?.[200]?.headers).to.deep.eq({
              linkE: {
                required: true,
                schema: { type: 'string' },
                description: undefined,
              },
              linkF: {
                required: true,
                schema: { type: 'array', items: { type: 'string' } },
                description: undefined,
              },
              linkOpt: {
                required: false,
                schema: { type: 'string' },
                description: undefined,
              },
            });
          });
        });
        describe('should generate headers from class response decorator.', () => {
          it('with header class.', () => {
            const metadata = new MetadataGenerator('./fixtures/controllers/commonResponseHeaderClassController.ts').Generate();
            const responseSpec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
            const paths = ['Response1', 'Response2'];
            paths.forEach((path: string) => {
              const responses = responseSpec.paths[`/CommonResponseHeaderClass/${path}`].get?.responses;
              expect(responses?.[200]?.headers?.CommonResponseHeader).to.deep.eq({
                schema: {
                  $ref: '#/components/schemas/CommonResponseHeader',
                },
                description: "Common response header's description",
              });
            });
          });

          it('with header object.', () => {
            const metadata = new MetadataGenerator('./fixtures/controllers/commonResponseHeaderObjectController.ts').Generate();
            const responseSpec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
            const paths = ['Response1', 'Response2'];
            paths.forEach((path: string) => {
              const responses = responseSpec.paths[`/CommonResponseHeaderObject/${path}`].get?.responses;
              expect(responses?.[200]?.headers).to.deep.eq({
                objectA: {
                  required: true,
                  schema: { type: 'string' },
                  description: undefined,
                },
                objectB: {
                  required: true,
                  schema: { type: 'array', items: { type: 'string' } },
                  description: undefined,
                },
                objectC: {
                  required: false,
                  schema: { type: 'string' },
                  description: undefined,
                },
              });
            });
          });
        });

        it('Supports multiple examples', () => {
          const metadata = new MetadataGenerator('./fixtures/controllers/exampleController.ts').Generate();
          const exampleSpec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();

          const examples = exampleSpec.paths['/ExampleTest/MultiResponseExamples']?.get?.responses?.[200]?.content?.['application/json'].examples;

          expect(examples).to.deep.eq({
            'Example 1': {
              value: 'test 1',
            },
            'Example 2': {
              value: 'test 2',
            },
          });
        });
      });

      describe('deprecation', () => {
        it('marks deprecated methods as deprecated', () => {
          const metadata = new MetadataGenerator('./fixtures/controllers/deprecatedController.ts').Generate();
          const deprecatedSpec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();

          expect(deprecatedSpec.paths['/Controller/deprecatedGetMethod']?.get?.deprecated).to.eql(true);
          expect(deprecatedSpec.paths['/Controller/deprecatedGetMethod2']?.get?.deprecated).to.eql(true);
        });

        it('marks deprecated parameters as deprecated', () => {
          const metadata = new MetadataGenerator('./fixtures/controllers/parameterController.ts').Generate();
          const deprecatedSpec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();

          const parameters = deprecatedSpec.paths['/ParameterTest/ParameterDeprecated']?.post?.parameters ?? [];
          expect(parameters.map(param => param.deprecated)).to.eql([undefined, true, true]);
        });
      });
    });
  });

  describe('components', () => {
    describe('schemas', () => {
      it('should replace definitions with schemas', () => {
        if (!specDefault.spec.components.schemas) {
          throw new Error('Schemas not defined.');
        }

        expect(specDefault.spec).to.not.have.property('definitions');
        expect(specDefault.spec.components.schemas.TestModel).to.exist;
      });

      it('should replace x-nullable with nullable', () => {
        if (!specDefault.spec.components.schemas) {
          throw new Error('Schemas not defined.');
        }
        if (!specDefault.spec.components.schemas.TestModel) {
          throw new Error('TestModel not defined.');
        }

        const testModel = specDefault.spec.components.schemas.TestModel;

        if (!testModel.properties) {
          throw new Error('testModel.properties should have been a truthy object');
        }
        expect(testModel.properties.optionalString).to.not.have.property('x-nullable');
        expect(testModel.properties.optionalString.nullable).to.be.undefined;
      });
    });
  });

  describe('xEnumVarnames', () => {
    it('EnumNumberValue', () => {
      const schema = getComponentSchema('EnumNumberValue', specWithXEnumVarnames);
      expect(schema['x-enum-varnames']).to.eql(['VALUE_0', 'VALUE_1', 'VALUE_2']);
    });
    it('EnumStringValue', () => {
      const schema = getComponentSchema('EnumStringValue', specWithXEnumVarnames);
      expect(schema['x-enum-varnames']).to.eql(['EMPTY', 'VALUE_1', 'VALUE_2']);
    });
    it('EnumStringNumberValue', () => {
      const schema = getComponentSchema('EnumStringNumberValue', specWithXEnumVarnames);
      expect(schema['x-enum-varnames']).to.eql(['VALUE_0', 'VALUE_1', 'VALUE_2']);
    });
  });

  allSpecs.forEach(currentSpec => {
    describe(`for ${currentSpec.specName}`, () => {
      describe('should set additionalProperties to false if noImplicitAdditionalProperties is set to "throw-on-extras" (when there are no dictionary or any types)', () => {
        // Arrange

        // Assert
        if (!currentSpec.spec.components.schemas) {
          throw new Error('spec.components.schemas should have been truthy');
        }

        const interfaceModelName = 'TestModel';

        /**
         * By creating a record of "keyof T" we ensure that contributors will need add a test for any new property that is added to the model
         */
        const assertionsPerProperty: Record<keyof TestModel, (propertyName: string, schema: Swagger.Schema3) => void> = {
          id: (propertyName, propertySchema) => {
            // should generate properties from extended interface
            expect(propertySchema.type).to.eq('number', `for property ${propertyName}.type`);
            expect(propertySchema.format).to.eq('double', `for property ${propertyName}.format`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          numberValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('number', `for property ${propertyName}.type`);
            expect(propertySchema.format).to.eq('double', `for property ${propertyName}.format`);
            const descriptionFromJsDocs = 'This is a description of this model property, numberValue';
            expect(propertySchema.description).to.eq(descriptionFromJsDocs, `for property ${propertyName}.description`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          // tslint:disable-next-line: object-literal-sort-keys
          numberArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.type).to.eq('number', `for property ${propertyName}.items.type`);
            expect(propertySchema.items.format).to.eq('double', `for property ${propertyName}.items.format`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          stringValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema.format).to.eq('password', `for property ${propertyName}.format`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          stringArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.type).to.eq('string', `for property ${propertyName}.items.type`);
            expect(propertySchema.items.format).to.eq(undefined, `for property ${propertyName}.items.format`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          boolValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('boolean', `for property ${propertyName}.type`);
            expect(propertySchema.default).to.eq('true', `for property ${propertyName}.default`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          boolArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.type).to.eq('boolean', `for property ${propertyName}.items.type`);
            expect(propertySchema.items.default).to.eq(undefined, `for property ${propertyName}.items.default`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          objLiteral: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.include({
              properties: {
                name: {
                  type: 'string',
                  default: undefined,
                  description: undefined,
                  format: undefined,
                  example: undefined,
                },
                deprecatedSubProperty: { type: 'number', default: undefined, description: undefined, format: 'double', example: undefined, deprecated: true },
                nested: {
                  properties: {
                    additionals: {
                      properties: {},
                      type: 'object',
                      default: undefined,
                      description: undefined,
                      format: undefined,
                      example: undefined,
                      additionalProperties: {
                        $ref: '#/components/schemas/TypeAliasModel1',
                      },
                    },
                    allNestedOptional: {
                      properties: {
                        one: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                        two: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                      },
                      type: 'object',
                      default: undefined,
                      description: undefined,
                      format: undefined,
                      example: undefined,
                    },
                    bool: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined },
                    optional: { format: 'double', type: 'number', default: undefined, description: undefined, example: undefined },
                  },
                  required: ['allNestedOptional', 'bool'],
                  type: 'object',
                  default: undefined,
                  description: undefined,
                  format: undefined,
                  example: undefined,
                },
              },
              required: ['name'],
              type: 'object',
            });
          },
          notDeprecatedProperty: (propertyName, propertySchema) => {
            expect(propertySchema.deprecated).to.eq(undefined, `for property ${propertyName}.deprecated`);
          },
          propertyOfDeprecatedType: (propertyName, propertySchema) => {
            // property is not explicitly deprecated, but the type's schema is
            expect(propertySchema.deprecated).to.eq(undefined, `for property ${propertyName}.deprecated`);
            const typeSchema = currentSpec.spec.components.schemas!['DeprecatedType'];
            expect(typeSchema.deprecated).to.eq(true, `for DeprecatedType`);
          },
          propertyOfDeprecatedClass: (propertyName, propertySchema) => {
            // property is not explicitly deprecated, but the type's schema is
            expect(propertySchema.deprecated).to.eq(undefined, `for property ${propertyName}.deprecated`);
            const typeSchema = currentSpec.spec.components.schemas!['DeprecatedClass'];
            expect(typeSchema.deprecated).to.eq(true, `for DeprecatedClass`);
          },
          deprecatedProperty: (propertyName, propertySchema) => {
            expect(propertySchema.deprecated).to.eq(true, `for property ${propertyName}.deprecated`);
          },
          deprecatedFieldsOnInlineMappedTypeFromSignature: (propertyName, propertySchema) => {
            expect(propertySchema.properties!.okProp.deprecated).to.eql(undefined, `for property okProp.deprecated`);
            expect(propertySchema.properties!.notOkProp.deprecated).to.eql(true, `for property notOkProp.deprecated`);
          },
          deprecatedFieldsOnInlineMappedTypeFromDeclaration: (propertyName, propertySchema) => {
            expect(propertySchema.properties!.okProp.deprecated).to.eql(undefined, `for property okProp.deprecated`);
            expect(propertySchema.properties!.notOkProp.deprecated).to.eql(true, `for property notOkProp.deprecated`);
            expect(propertySchema.properties!.stillNotOkProp.deprecated).to.eql(true, `for property stillNotOkProp.deprecated`);
          },
          notDeprecatedFieldsOnInlineMappedTypeWithIndirection: (propertyName, propertySchema) => {
            // See corresponding `deprecated: false` in TypeResolver#resolve
            expect(propertySchema.properties!.notOk.deprecated).to.eql(undefined, `for property notOk.deprecated`);
          },
          object: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('object', `for property ${propertyName}`);
            if (currentSpec.specName === 'specWithNoImplicitExtras') {
              expect(propertySchema.additionalProperties).to.eq(false, forSpec(currentSpec));
            } else {
              expect(propertySchema.additionalProperties).to.eq(true, forSpec(currentSpec));
            }
          },
          objectArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}`);
            // Now check the items on the array of objects
            if (!propertySchema.items) {
              throw new Error(`There was no \'items\' property on ${propertyName}.`);
            }
            expect(propertySchema.items.type).to.equal('object');
            // The "PetShop" Swagger editor considers it valid to have additionalProperties on an array of objects
            //      So, let's convince TypeScript
            const itemsAsSchema = propertySchema.items as Swagger.Schema;
            if (currentSpec.specName === 'specWithNoImplicitExtras') {
              expect(itemsAsSchema.additionalProperties).to.eq(false, forSpec(currentSpec));
            } else {
              expect(itemsAsSchema.additionalProperties).to.eq(true, forSpec(currentSpec));
            }
          },
          enumValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema.$ref).to.eq('#/components/schemas/EnumIndexValue', `for property ${propertyName}.$ref`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          enumArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/components/schemas/EnumIndexValue', `for property ${propertyName}.items.$ref`);
          },
          enumNumberValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema.$ref).to.eq('#/components/schemas/EnumNumberValue', `for property ${propertyName}.$ref`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);

            const schema = getComponentSchema('EnumNumberValue', currentSpec);
            expect(schema.type).to.eq('number');
            expect(schema.enum).to.eql([0, 2, 5]);
            expect(schema['x-enum-varnames']).to.eq(undefined);
          },
          enumStringNumberValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema.$ref).to.eq('#/components/schemas/EnumStringNumberValue', `for property ${propertyName}.$ref`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);

            const schema = getComponentSchema('EnumStringNumberValue', currentSpec);
            expect(schema.type).to.eq('string');
            expect(schema.enum).to.eql(['0', '2', '5']);
            expect(schema['x-enum-varnames']).to.eq(undefined);
          },
          enumStringNumberArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/components/schemas/EnumStringNumberValue', `for property ${propertyName}.items.$ref`);
          },
          enumNumberArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/components/schemas/EnumNumberValue', `for property ${propertyName}.items.$ref`);
          },
          enumStringValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.$ref).to.eq('#/components/schemas/EnumStringValue', `for property ${propertyName}.$ref`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);

            const schema = getComponentSchema('EnumStringValue', currentSpec);
            expect(schema.type).to.eq('string');
            expect(schema.enum).to.eql(['', 'VALUE_1', 'VALUE_2']);
            expect(schema['x-enum-varnames']).to.eq(undefined);
          },
          enumStringProperty: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/EnumStringValue.VALUE_1');
            const schema = getComponentSchema('EnumStringValue.VALUE_1', currentSpec);
            expect(schema).to.deep.eq({
              description: undefined,
              enum: ['VALUE_1'],
              type: 'string',
            });
          },
          enumStringArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/components/schemas/EnumStringValue', `for property ${propertyName}.items.$ref`);
          },
          modelValue: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModel', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          modelsArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/components/schemas/TestSubModel', `for property ${propertyName}.items.$ref`);
          },
          strLiteralVal: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/StrLiteral', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}[x-nullable]`);

            const componentSchema = getComponentSchema('StrLiteral', currentSpec);
            expect(componentSchema).to.deep.eq({
              default: undefined,
              description: undefined,
              enum: ['', 'Foo', 'Bar'],
              example: undefined,
              format: undefined,
              type: 'string',
            });
          },
          strLiteralArr: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.items!.$ref).to.eq('#/components/schemas/StrLiteral', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);

            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          unionPrimitiveType: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.eq({
              anyOf: [
                { type: 'string', enum: ['String'] },
                { type: 'number', enum: ['1', '20'] },
                { type: 'boolean', enum: ['true', 'false'] },
              ],
              default: undefined,
              description: undefined,
              example: undefined,
              format: undefined,
            });
          },
          nullableUnionPrimitiveType: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.eq({
              anyOf: [
                { type: 'string', enum: ['String'] },
                { type: 'number', enum: ['1', '20'] },
                { type: 'boolean', enum: ['true', 'false'] },
              ],
              default: undefined,
              description: undefined,
              example: undefined,
              format: undefined,
              nullable: true,
            });
          },
          singleFloatLiteralType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('number', `for property ${propertyName}.type`);
            expect(propertySchema.nullable).to.eq(false, `for property ${propertyName}.nullable`);
            if (!propertySchema.enum) {
              throw new Error(`There was no 'enum' property on ${propertyName}.`);
            }
            expect(propertySchema.enum).to.have.length(1, `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('3.1415', `for property ${propertyName}.enum`);
          },
          dateValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema.format).to.eq('date-time', `for property ${propertyName}.format`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          optionalString: (propertyName, propertySchema) => {
            // should generate an optional property from an optional property
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema).to.not.haveOwnProperty('format', `for property ${propertyName}`);
          },
          anyType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema.additionalProperties).to.eq(undefined, 'because the "any" type always allows more properties be definition');
          },
          unknownType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema.additionalProperties).to.eq(undefined, 'because the "unknown" type always allows more properties be definition');
          },
          genericTypeObject: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/Generic__foo-string--bar-boolean__');
          },
          indexed: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/Partial_Indexed-at-foo_');
          },
          record: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/Record_record-foo-or-record-bar._data-string__');
            const schema = getComponentSchema('Record_record-foo-or-record-bar._data-string__', currentSpec);
            expect(schema).to.be.deep.eq({
              properties: {
                'record-foo': {
                  properties: {
                    data: { type: 'string', description: undefined, example: undefined, format: undefined, default: undefined },
                  },
                  required: ['data'],
                  type: 'object',
                  description: undefined,
                  example: undefined,
                  format: undefined,
                  default: undefined,
                },
                'record-bar': {
                  properties: {
                    data: { type: 'string', description: undefined, example: undefined, format: undefined, default: undefined },
                  },
                  required: ['data'],
                  type: 'object',
                  description: undefined,
                  example: undefined,
                  format: undefined,
                  default: undefined,
                },
              },
              type: 'object',
              default: undefined,
              example: undefined,
              format: undefined,
              description: 'Construct a type with a set of properties K of type T',
            });
          },
          modelsObjectIndirect: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
          },
          modelsObjectIndirectNS: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModelContainerNamespace.TestSubModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
          },
          modelsObjectIndirectNS2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
          },
          modelsObjectIndirectNS_Alias: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModelContainerNamespace_TestSubModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
          },
          modelsObjectIndirectNS2_Alias: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
          },
          modelsArrayIndirect: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubArrayModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
          },
          modelsEnumIndirect: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubEnumModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
          },
          typeAliasCase1: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TypeAliasModelCase1', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
          },
          TypeAliasCase2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TypeAliasModelCase2', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
          },
          genericMultiNested: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequest_GenericRequest_TypeAliasModel1__', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayKeyword1: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequest_Array_TypeAliasModel1__', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayCharacter1: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequest_TypeAliasModel1-Array_', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayKeyword2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequest_Array_TypeAliasModel2__', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayCharacter2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequest_TypeAliasModel2-Array_', `for property ${propertyName}.$ref`);
          },
          defaultGenericModel: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericModel', `for property ${propertyName}.$ref`);

            const definition = getComponentSchema('GenericModel', currentSpec);
            expect(definition.properties!.result.type).to.deep.equal('string');
            // string | string reduced to just string after removal of duplicate
            // types when generating union spec
            expect(definition.properties!.union.type).to.deep.equal('string');
            expect(definition.properties!.nested.$ref).to.deep.equal('#/components/schemas/GenericRequest_string_');
          },
          and: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.include(
              {
                allOf: [{ $ref: '#/components/schemas/TypeAliasModel1' }, { $ref: '#/components/schemas/TypeAliasModel2' }],
              },
              `for property ${propertyName}.$ref`,
            );
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          referenceAnd: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.include(
              {
                $ref: '#/components/schemas/TypeAliasModelCase1',
              },
              `for property ${propertyName}.$ref`,
            );
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          or: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.include(
              {
                anyOf: [{ $ref: '#/components/schemas/TypeAliasModel1' }, { $ref: '#/components/schemas/TypeAliasModel2' }],
              },
              `for property ${propertyName}.$ref`,
            );
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          mixedUnion: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.include(
              {
                anyOf: [{ type: 'string' }, { $ref: '#/components/schemas/TypeAliasModel1' }],
              },
              `for property ${propertyName}.$ref`,
            );
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          typeAliases: (propertyName, propertySchema) => {
            expect(propertyName).to.equal('typeAliases');
            expect(propertySchema).to.deep.equal({
              default: undefined,
              description: undefined,
              format: undefined,
              example: undefined,
              properties: {
                word: { $ref: '#/components/schemas/Word', description: undefined, format: undefined, example: undefined },
                fourtyTwo: { $ref: '#/components/schemas/FourtyTwo', description: undefined, format: undefined, example: undefined },
                dateAlias: { $ref: '#/components/schemas/DateAlias', description: undefined, format: undefined, example: undefined },
                unionAlias: { $ref: '#/components/schemas/UnionAlias', description: undefined, format: undefined, example: undefined },
                intersectionAlias: { $ref: '#/components/schemas/IntersectionAlias', description: undefined, format: undefined, example: undefined },
                nOLAlias: { $ref: '#/components/schemas/NolAlias', description: undefined, format: undefined, example: undefined },
                genericAlias: { $ref: '#/components/schemas/GenericAlias_string_', description: undefined, format: undefined, example: undefined },
                genericAlias2: { $ref: '#/components/schemas/GenericAlias_Model_', description: undefined, format: undefined, example: undefined },
                forwardGenericAlias: { $ref: '#/components/schemas/ForwardGenericAlias_boolean.TypeAliasModel1_', description: undefined, format: undefined, example: undefined },
              },
              required: ['forwardGenericAlias', 'genericAlias2', 'genericAlias', 'nOLAlias', 'intersectionAlias', 'unionAlias', 'fourtyTwo', 'word'],
              type: 'object',
            });

            const wordSchema = getComponentSchema('Word', currentSpec);
            expect(wordSchema).to.deep.eq({ type: 'string', description: 'A Word shall be a non-empty sting', example: undefined, default: undefined, minLength: 1, format: 'password' });

            const fourtyTwoSchema = getComponentSchema('FourtyTwo', currentSpec);
            expect(fourtyTwoSchema).to.deep.eq({
              type: 'integer',
              format: 'int32',
              description: 'The number 42 expressed through OpenAPI',
              example: 42,
              minimum: 42,
              maximum: 42,
              default: '42',
            });

            const dateAliasSchema = getComponentSchema('DateAlias', currentSpec);
            expect(dateAliasSchema).to.deep.eq({ type: 'string', format: 'date', description: undefined, example: undefined, default: undefined });

            const unionAliasSchema = getComponentSchema('UnionAlias', currentSpec);
            expect(unionAliasSchema).to.deep.eq({
              anyOf: [{ $ref: '#/components/schemas/TypeAliasModelCase2' }, { $ref: '#/components/schemas/TypeAliasModel2' }],
              description: undefined,
              example: undefined,
              default: undefined,
              format: undefined,
            });

            const intersectionAliasSchema = getComponentSchema('IntersectionAlias', currentSpec);
            expect(intersectionAliasSchema).to.deep.eq({
              allOf: [
                {
                  properties: {
                    value1: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                    value2: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                  },
                  required: ['value2', 'value1'],
                  type: 'object',
                },
                { $ref: '#/components/schemas/TypeAliasModel1' },
              ],
              description: undefined,
              example: undefined,
              format: undefined,
              default: undefined,
            });

            const nolAliasSchema = getComponentSchema('NolAlias', currentSpec);
            expect(nolAliasSchema).to.deep.eq({
              properties: {
                value1: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                value2: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
              },
              required: ['value2', 'value1'],
              type: 'object',
              description: undefined,
              example: undefined,
              default: undefined,
              format: undefined,
            });

            const genericAliasStringSchema = getComponentSchema('GenericAlias_string_', currentSpec);
            expect(genericAliasStringSchema).to.deep.eq({ type: 'string', default: undefined, description: undefined, example: undefined, format: undefined });

            const genericAliasModelSchema = getComponentSchema('GenericAlias_Model_', currentSpec);
            expect(genericAliasModelSchema).to.deep.eq({ $ref: '#/components/schemas/Model', default: undefined, description: undefined, example: undefined, format: undefined });

            const forwardGenericAliasBooleanAndTypeAliasModel1Schema = getComponentSchema('ForwardGenericAlias_boolean.TypeAliasModel1_', currentSpec);
            expect(forwardGenericAliasBooleanAndTypeAliasModel1Schema).to.deep.eq({
              anyOf: [{ $ref: '#/components/schemas/GenericAlias_TypeAliasModel1_' }, { type: 'boolean' }],
              description: undefined,
              example: undefined,
              default: undefined,
              format: undefined,
            });

            expect(getComponentSchema('GenericAlias_TypeAliasModel1_', currentSpec)).to.deep.eq({
              $ref: '#/components/schemas/TypeAliasModel1',
              description: undefined,
              example: undefined,
              default: undefined,
              format: undefined,
            });
          },
          advancedTypeAliases: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.eq(
              {
                properties: {
                  omit: { $ref: '#/components/schemas/Omit_ErrorResponseModel.status_', description: undefined, format: undefined, example: undefined },
                  omitHidden: { $ref: '#/components/schemas/Omit_PrivateModel.stringPropDec1_', description: undefined, format: undefined, example: undefined },
                  partial: { $ref: '#/components/schemas/Partial_Account_', description: undefined, format: undefined, example: undefined },
                  excludeToEnum: { $ref: '#/components/schemas/Exclude_EnumUnion.EnumNumberValue_', description: undefined, format: undefined, example: undefined },
                  excludeToAlias: { $ref: '#/components/schemas/Exclude_ThreeOrFour.TypeAliasModel3_', description: undefined, format: undefined, example: undefined },
                  excludeLiteral: {
                    $ref:
                      '#/components/schemas/Exclude_keyofTestClassModel.account-or-defaultValue2-or-indexedTypeToInterface-or-indexedTypeToClass-or-indexedTypeToAlias-or-indexedResponseObject-or-arrayUnion-or-objectUnion_',
                    description: undefined,
                    format: undefined,
                    example: undefined,
                  },
                  excludeToInterface: { $ref: '#/components/schemas/Exclude_OneOrTwo.TypeAliasModel1_', description: undefined, format: undefined, example: undefined },
                  excludeTypeToPrimitive: { $ref: '#/components/schemas/NonNullable_number-or-null_', description: undefined, format: undefined, example: undefined },
                  pick: { $ref: '#/components/schemas/Pick_ThingContainerWithTitle_string_.list_', description: undefined, format: undefined, example: undefined },
                  readonlyClass: { $ref: '#/components/schemas/Readonly_TestClassModel_', description: undefined, format: undefined, example: undefined },
                  defaultArgs: { $ref: '#/components/schemas/DefaultTestModel', description: undefined, format: undefined, example: undefined },
                  heritageCheck: { $ref: '#/components/schemas/HeritageTestModel', description: undefined, format: undefined, example: undefined },
                },
                type: 'object',
                default: undefined,
                description: undefined,
                format: undefined,
                example: undefined,
              },
              `for property ${propertyName}`,
            );

            const getterClass = getComponentSchema('GetterClass', currentSpec);
            expect(getterClass).to.deep.eq({
              allOf: [
                {
                  $ref: '#/components/schemas/NonFunctionProperties_GetterClass_',
                },
                {
                  properties: {
                    foo: {
                      type: 'string',
                      description: undefined,
                      example: undefined,
                      format: undefined,
                      default: undefined,
                    },
                  },
                  required: ['foo'],
                  type: 'object',
                },
              ],
              default: undefined,
              example: undefined,
              format: undefined,
              description: undefined,
            });
            const getterClass2 = getComponentSchema('NonFunctionProperties_GetterClass_', currentSpec);
            expect(getterClass2).to.deep.eq({
              $ref: '#/components/schemas/Pick_GetterClass.NonFunctionPropertyNames_GetterClass__',
              description: undefined,
              example: undefined,
              format: undefined,
              default: undefined,
            });
            const getterClass3 = getComponentSchema('Pick_GetterClass.NonFunctionPropertyNames_GetterClass__', currentSpec);
            expect(getterClass3).to.deep.eq({
              default: undefined,
              description: 'From T, pick a set of properties whose keys are in the union K',
              example: undefined,
              format: undefined,
              properties: {
                a: {
                  type: 'string',
                  enum: ['b'],
                  nullable: false,
                  description: undefined,
                  example: undefined,
                  format: undefined,
                  default: undefined,
                },
              },
              required: ['a'],
              type: 'object',
            });

            const getterInterface = getComponentSchema('GetterInterface', currentSpec);
            expect(getterInterface).to.deep.eq({
              properties: {
                foo: {
                  type: 'string',
                  description: undefined,
                  example: undefined,
                  format: undefined,
                  default: undefined,
                },
              },
              required: ['foo'],
              type: 'object',
              default: undefined,
              example: undefined,
              format: undefined,
              description: undefined,
            });

            const getterInterfaceHerited = getComponentSchema('GetterInterfaceHerited', currentSpec);
            expect(getterInterfaceHerited).to.deep.eq({
              properties: {
                foo: {
                  type: 'string',
                  description: undefined,
                  example: undefined,
                  format: undefined,
                  default: undefined,
                },
              },
              required: ['foo'],
              type: 'object',
              default: undefined,
              example: undefined,
              format: undefined,
              description: undefined,
            });

            const omit = getComponentSchema('Omit_ErrorResponseModel.status_', currentSpec);
            expect(omit).to.deep.eq(
              {
                $ref: '#/components/schemas/Pick_ErrorResponseModel.Exclude_keyofErrorResponseModel.status__',
                description: 'Construct a type with the properties of T except for those in type K.',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const omitReference = getComponentSchema('Pick_ErrorResponseModel.Exclude_keyofErrorResponseModel.status__', currentSpec);
            expect(omitReference).to.deep.eq(
              {
                properties: { message: { type: 'string', default: undefined, description: undefined, format: undefined, minLength: 2, example: undefined } },
                required: ['message'],
                type: 'object',
                description: 'From T, pick a set of properties whose keys are in the union K',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const omitHidden = getComponentSchema('Omit_PrivateModel.stringPropDec1_', currentSpec);
            expect(omitHidden).to.deep.eq(
              {
                $ref: '#/components/schemas/Pick_PrivateModel.Exclude_keyofPrivateModel.stringPropDec1__',
                description: 'Construct a type with the properties of T except for those in type K.',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const omitHiddenReference = getComponentSchema('Pick_PrivateModel.Exclude_keyofPrivateModel.stringPropDec1__', currentSpec);
            expect(omitHiddenReference).to.deep.eq(
              {
                properties: {
                  id: { type: 'number', format: 'double', default: undefined, description: undefined, example: undefined },
                  stringPropDec2: { type: 'string', default: undefined, description: undefined, format: undefined, minLength: 2, example: undefined },
                },
                required: ['stringPropDec2', 'id'],
                type: 'object',
                description: 'From T, pick a set of properties whose keys are in the union K',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const partial = getComponentSchema('Partial_Account_', currentSpec);
            expect(partial).to.deep.eq(
              {
                properties: { id: { type: 'number', format: 'double', default: undefined, example: undefined, description: undefined } },
                type: 'object',
                description: 'Make all properties in T optional',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const excludeToEnum = getComponentSchema('Exclude_EnumUnion.EnumNumberValue_', currentSpec);
            expect(excludeToEnum).to.deep.eq(
              {
                $ref: '#/components/schemas/EnumIndexValue',
                description: 'Exclude from T those types that are assignable to U',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const excludeToAlias = getComponentSchema('Exclude_ThreeOrFour.TypeAliasModel3_', currentSpec);
            expect(excludeToAlias).to.deep.eq(
              {
                $ref: '#/components/schemas/TypeAlias4',
                description: 'Exclude from T those types that are assignable to U',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const excludeToAliasTypeAlias4 = getComponentSchema('TypeAlias4', currentSpec);
            expect(excludeToAliasTypeAlias4).to.deep.eq(
              {
                properties: { value4: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined } },
                required: ['value4'],
                type: 'object',
                default: undefined,
                description: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const excludeLiteral = getComponentSchema(
              'Exclude_keyofTestClassModel.account-or-defaultValue2-or-indexedTypeToInterface-or-indexedTypeToClass-or-indexedTypeToAlias-or-indexedResponseObject-or-arrayUnion-or-objectUnion_',
              currentSpec,
            );
            expect(excludeLiteral).to.deep.eq(
              {
                default: undefined,
                description: 'Exclude from T those types that are assignable to U',
                enum: [
                  'id',
                  'enumKeys',
                  'keyInterface',
                  'indexedType',
                  'indexedResponse',
                  'publicStringProperty',
                  'optionalPublicStringProperty',
                  'emailPattern',
                  'stringProperty',
                  'deprecated1',
                  'deprecated2',
                  'publicConstructorVar',
                  'readonlyConstructorArgument',
                  'optionalPublicConstructorVar',
                  'deprecatedPublicConstructorVar',
                  'deprecatedPublicConstructorVar2',
                  'myIgnoredMethod',
                  'defaultValue1',
                ],
                example: undefined,
                format: undefined,
                type: 'string',
              },
              `for a schema linked by property ${propertyName}`,
            );

            const excludeToInterface = getComponentSchema('Exclude_OneOrTwo.TypeAliasModel1_', currentSpec);
            expect(excludeToInterface).to.deep.eq(
              {
                $ref: '#/components/schemas/TypeAliasModel2',
                description: 'Exclude from T those types that are assignable to U',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const excludeTypeToPrimitive = getComponentSchema('NonNullable_number-or-null_', currentSpec);
            expect(excludeTypeToPrimitive).to.deep.eq(
              {
                type: 'number',
                format: 'double',
                default: undefined,
                example: undefined,
                description: 'Exclude null and undefined from T',
              },
              `for a schema linked by property ${propertyName}`,
            );

            const pick = getComponentSchema('Pick_ThingContainerWithTitle_string_.list_', currentSpec);
            expect(pick).to.deep.eq(
              {
                properties: {
                  list: {
                    items: { $ref: '#/components/schemas/ThingContainerWithTitle_string_' },
                    type: 'array',
                    default: undefined,
                    description: undefined,
                    format: undefined,
                    example: undefined,
                  },
                },
                required: ['list'],
                type: 'object',
                description: 'From T, pick a set of properties whose keys are in the union K',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const customRecord = getComponentSchema('Record_id.string_', currentSpec);
            expect(customRecord).to.deep.eq({
              default: undefined,
              description: 'Construct a type with a set of properties K of type T',
              format: undefined,
              example: undefined,
              properties: {
                id: {
                  default: undefined,
                  description: undefined,
                  example: undefined,
                  format: undefined,
                  type: 'string',
                },
              },
              type: 'object',
            });

            const readonlyClassSchema = getComponentSchema('Readonly_TestClassModel_', currentSpec);
            expect(readonlyClassSchema).to.deep.eq(
              {
                properties: {
                  defaultValue1: { type: 'string', default: 'Default Value 1', description: undefined, format: undefined, example: undefined },
                  enumKeys: {
                    default: undefined,
                    description: undefined,
                    enum: ['OK', 'KO'],
                    example: undefined,
                    format: undefined,
                    type: 'string',
                  },
                  id: { type: 'number', format: 'double', default: undefined, description: undefined, example: undefined },
                  indexedResponse: {
                    $ref: '#/components/schemas/Record_id.string_',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                  },
                  indexedResponseObject: {
                    $ref: '#/components/schemas/Record_id.any_',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                  },
                  indexedType: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                  indexedTypeToClass: { $ref: '#/components/schemas/IndexedClass', description: undefined, format: undefined, example: undefined },
                  indexedTypeToInterface: { $ref: '#/components/schemas/IndexedInterface', description: undefined, format: undefined, example: undefined },
                  indexedTypeToAlias: { $ref: '#/components/schemas/IndexedInterfaceAlias', description: undefined, format: undefined, example: undefined },
                  arrayUnion: {
                    default: undefined,
                    description: undefined,
                    enum: ['foo', 'bar'],
                    example: undefined,
                    format: undefined,
                    type: 'string',
                  },
                  objectUnion: {
                    default: undefined,
                    description: undefined,
                    enum: ['foo', 'bar'],
                    example: undefined,
                    format: undefined,
                    type: 'string',
                  },
                  keyInterface: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined, enum: ['id'], nullable: false },
                  optionalPublicConstructorVar: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                  readonlyConstructorArgument: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                  publicConstructorVar: { type: 'string', default: undefined, description: 'This is a description for publicConstructorVar', format: undefined, example: undefined },
                  stringProperty: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                  emailPattern: { type: 'string', default: undefined, description: undefined, format: 'email', pattern: '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$', example: undefined },
                  optionalPublicStringProperty: { type: 'string', minLength: 0, maxLength: 10, default: undefined, description: undefined, format: undefined, example: undefined },
                  publicStringProperty: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 20,
                    pattern: '^[a-zA-Z]+$',
                    default: undefined,
                    description: 'This is a description of a public string property',
                    format: undefined,
                    example: 'classPropExample',
                  },
                  defaultValue2: { type: 'string', default: 'Default Value 2', description: undefined, format: undefined, example: undefined },
                  account: { $ref: '#/components/schemas/Account', format: undefined, description: undefined, example: undefined },
                  deprecated1: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined, deprecated: true },
                  deprecated2: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined, deprecated: true },
                  deprecatedPublicConstructorVar: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined, deprecated: true },
                  deprecatedPublicConstructorVar2: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined, deprecated: true },
                },
                required: ['account', 'enumKeys', 'publicStringProperty', 'stringProperty', 'publicConstructorVar', 'readonlyConstructorArgument', 'id'],
                type: 'object',
                description: 'Make all properties in T readonly',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for schema linked by property ${propertyName}`,
            );

            const defaultArgs = getComponentSchema('DefaultTestModel', currentSpec);
            expect(defaultArgs).to.deep.eq(
              {
                description: undefined,
                properties: {
                  t: { $ref: '#/components/schemas/GenericRequest_Word_', description: undefined, format: undefined, example: undefined },
                  u: { $ref: '#/components/schemas/DefaultArgs_Omit_ErrorResponseModel.status__', description: undefined, format: undefined, example: undefined },
                },
                required: ['t', 'u'],
                type: 'object',
                additionalProperties: currentSpec.specName === 'specWithNoImplicitExtras' ? false : true,
              },
              `for schema linked by property ${propertyName}`,
            );

            const heritageCheck = getComponentSchema('HeritageTestModel', currentSpec);
            expect(heritageCheck).to.deep.eq(
              {
                properties: {
                  value4: { type: 'string', description: undefined, format: undefined, example: undefined, default: undefined },
                  name: { type: 'string', description: undefined, format: undefined, example: undefined, default: undefined },
                },
                required: ['value4'],
                type: 'object',
                additionalProperties: currentSpec.specName === 'specWithNoImplicitExtras' ? false : true,
                description: undefined,
              },
              `for schema linked by property ${propertyName}`,
            );
          },
          nullableTypes: (propertyName, propertySchema) => {
            expect(propertyName).to.equal('nullableTypes');
            expect(propertySchema).to.deep.equal({
              default: undefined,
              description: undefined,
              example: {
                justNull: null,
                maybeString: null,
                numberOrNull: null,
                wordOrNull: null,
              },
              format: undefined,
              properties: {
                maybeString: { $ref: '#/components/schemas/Maybe_string_', description: undefined, format: undefined, example: undefined },
                wordOrNull: { $ref: '#/components/schemas/Maybe_Word_', description: undefined, format: undefined, example: undefined },
                numberOrNull: {
                  default: undefined,
                  description: undefined,
                  example: undefined,
                  type: 'integer',
                  format: 'int32',
                  minimum: 5,
                  nullable: true,
                },
                justNull: {
                  default: undefined,
                  description: undefined,
                  example: undefined,
                  enum: [null],
                  format: undefined,
                  nullable: true,
                  type: 'number',
                },
              },
              required: ['justNull', 'maybeString', 'wordOrNull', 'numberOrNull'],
              type: 'object',
            });

            const maybeString = getComponentSchema('Maybe_string_', currentSpec);
            expect(maybeString).to.deep.eq(
              {
                default: undefined,
                description: undefined,
                example: undefined,
                format: undefined,
                nullable: true,
                type: 'string',
              },
              `for schema linked by property ${propertyName}`,
            );

            const maybeWord = getComponentSchema('Maybe_Word_', currentSpec);
            expect(maybeWord).to.deep.eq(
              { allOf: [{ $ref: '#/components/schemas/Word' }], description: undefined, default: undefined, example: undefined, format: undefined, nullable: true },
              `for schema linked by property ${propertyName}`,
            );
          },
          templateLiteralString: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.eq({ $ref: '#/components/schemas/TemplateLiteralString', description: undefined, example: undefined, format: undefined });

            const tlsSchema = getComponentSchema('TemplateLiteralString', currentSpec);

            expect(tlsSchema).to.deep.eq({ $ref: '#/components/schemas/OrderOptions_ParameterTestModel_', default: undefined, example: undefined, format: undefined, description: undefined });

            const orderOptionsSchema = getComponentSchema('OrderOptions_ParameterTestModel_', currentSpec);

            expect(orderOptionsSchema).to.deep.eq(
              {
                default: undefined,
                description: undefined,
                enum: [
                  'firstname:asc',
                  'lastname:asc',
                  'age:asc',
                  'weight:asc',
                  'human:asc',
                  'gender:asc',
                  'nicknames:asc',
                  'firstname:desc',
                  'lastname:desc',
                  'age:desc',
                  'weight:desc',
                  'human:desc',
                  'gender:desc',
                  'nicknames:desc',
                ],
                example: undefined,
                format: undefined,
                type: 'string',
                nullable: false,
              },
              `for property ${propertyName}`,
            );
          },
          inlineTLS: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.eq(
              {
                default: undefined,
                description: undefined,
                enum: ['ASC', 'DESC'],
                example: undefined,
                format: undefined,
                type: 'string',
                nullable: false,
              },
              `for property ${propertyName}`,
            );
          },
          inlineMappedType: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.equal(
              {
                properties: {
                  'lastname:asc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'age:asc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'weight:asc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'human:asc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'gender:asc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'nicknames:asc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'firstname:desc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'lastname:desc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'age:desc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'weight:desc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'human:desc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'gender:desc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                  'nicknames:desc': {
                    type: 'boolean',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                    default: undefined,
                  },
                },
                type: 'object',
                description: undefined,
                example: undefined,
                format: undefined,
                default: undefined,
              },
              `for property ${propertyName}`,
            );
          },
          inlineMappedTypeRemapped: (propertyName, propertySchema) => {
            expect(Object.keys(propertySchema.properties || {})).to.have.members(
              ['FirstnameProp', 'LastnameProp', 'AgeProp', 'WeightProp', 'HumanProp', 'GenderProp', 'NicknamesProp'],
              `for property ${propertyName}`,
            );
          },
          stringAndBoolArray: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.eq({
              items: {
                anyOf: [{ type: 'string' }, { type: 'boolean' }],
              },
              type: 'array',
              default: undefined,
              description: undefined,
              example: undefined,
              format: undefined,
            });
          },
        };

        const testModel = currentSpec.spec.components.schemas[interfaceModelName];
        Object.keys(assertionsPerProperty).forEach(aPropertyName => {
          if (!testModel) {
            throw new Error(`There was no schema generated for the ${currentSpec.specName}`);
          }
          const propertySchema = testModel.properties![aPropertyName];
          if (!propertySchema) {
            throw new Error(`There was no ${aPropertyName} schema generated for the ${currentSpec.specName}`);
          }
          it(`should produce a valid schema for the ${aPropertyName} property on ${interfaceModelName} for the ${currentSpec.specName}`, () => {
            assertionsPerProperty[aPropertyName](aPropertyName, propertySchema);
          });
        });

        it('should make a choice about additionalProperties', () => {
          if (currentSpec.specName === 'specWithNoImplicitExtras') {
            expect(testModel.additionalProperties).to.eq(false, forSpec(currentSpec));
          } else {
            expect(testModel.additionalProperties).to.eq(true, forSpec(currentSpec));
          }
        });

        it('should have only created schemas for properties on the TypeScript interface', () => {
          expect(Object.keys(assertionsPerProperty)).to.length(
            Object.keys(testModel.properties!).length,
            `because the swagger spec (${currentSpec.specName}) should only produce property schemas for properties that live on the TypeScript interface.`,
          );
        });
      });
    });
  });

  describe('Deprecated class properties', () => {
    allSpecs.forEach(currentSpec => {
      const modelName = 'TestClassModel';
      // Assert
      if (!currentSpec.spec.components.schemas) {
        throw new Error('spec.components.schemas should have been truthy');
      }
      const definition = currentSpec.spec.components.schemas[modelName];

      if (!definition.properties) {
        throw new Error('Definition has no properties.');
      }

      const properties = definition.properties;

      describe(`for ${currentSpec}`, () => {
        it('should only mark deprecated properties as deprecated', () => {
          const deprecatedPropertyNames = ['deprecated1', 'deprecated2', 'deprecatedPublicConstructorVar', 'deprecatedPublicConstructorVar2'];
          Object.entries(properties).forEach(([propertyName, property]) => {
            if (deprecatedPropertyNames.includes(propertyName)) {
              expect(property.deprecated).to.eq(true, `for property ${propertyName}.deprecated`);
            } else {
              expect(property.deprecated).to.eq(undefined, `for property ${propertyName}.deprecated`);
            }
          });
        });
      });
    });
  });

  describe('mixed Enums', () => {
    it('should combine to metaschema', () => {
      // Arrange
      const schemaName = 'tooManyTypesEnum';
      const metadataForEnums: Tsoa.Metadata = {
        controllers: [],
        referenceTypeMap: {
          [schemaName]: {
            refName: schemaName,
            dataType: 'refEnum',
            enums: [1, 'two', 3, 'four'],
            deprecated: false,
          },
        },
      };
      const swaggerConfig: ExtendedSpecConfig = {
        outputDirectory: 'mockOutputDirectory',
        entryFile: 'mockEntryFile',
        noImplicitAdditionalProperties: 'ignore',
      };

      // Act
      const spec = new SpecGenerator3(metadataForEnums, swaggerConfig).GetSpec();

      // Assert
      expect(getComponentSchema(schemaName, { specName: 'specDefault', spec })).to.deep.eq({
        description: undefined,
        anyOf: [
          { type: 'number', enum: [1, 3] },
          { type: 'string', enum: ['two', 'four'] },
        ],
      });
    });
  });

  describe('Extensions schema generation', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/methodController').Generate();
    const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();

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
    expect(extensionPath).to.have.property('x-attKey4');

    // Verify that extensions have correct values
    expect(extensionPath['x-attKey']).to.deep.equal('attValue');
    expect(extensionPath['x-attKey1']).to.deep.equal({ test: 'testVal' });
    expect(extensionPath['x-attKey2']).to.deep.equal(['y0', 'y1']);
    expect(extensionPath['x-attKey3']).to.deep.equal([{ y0: 'yt0', y1: 'yt1' }, { y2: 'yt2' }]);
    expect(extensionPath['x-attKey4']).to.deep.equal({ test: ['testVal'] });
  });

  describe('module declarations with namespaces', () => {
    it('should generate the proper schema for a model declared in a namespace in a module', () => {
      /* tslint:disable:no-string-literal */
      const ref = specDefault.spec.paths['/GetTest/ModuleRedeclarationAndNamespace'].get?.responses['200'].content?.['application/json']['schema']['$ref'];
      /* tslint:enable:no-string-literal */
      expect(ref).to.equal('#/components/schemas/TsoaTest.TestModel73');
      expect(getComponentSchema('TsoaTest.TestModel73', specDefault)).to.deep.equal({
        additionalProperties: true,
        description: undefined,
        properties: {
          value: {
            default: undefined,
            description: undefined,
            example: undefined,
            format: undefined,
            type: 'string',
          },
        },
        required: undefined,
        type: 'object',
      });
    });
  });

  describe('@Res responses', () => {
    const expectTestModelContent = (response?: Swagger.Response3) => {
      expect(response?.content).to.deep.equal({
        'application/json': {
          schema: {
            $ref: '#/components/schemas/TestModel',
          },
        },
      });
    };

    it('creates a single error response for a single res parameter', () => {
      const responses = specDefault.spec.paths['/GetTest/Res']?.get?.responses;

      expect(responses).to.have.all.keys('204', '400');

      expectTestModelContent(responses?.['400']);
    });

    it('creates multiple error responses for separate res parameters', () => {
      const responses = specDefault.spec.paths['/GetTest/MultipleRes']?.get?.responses;

      expect(responses).to.have.all.keys('200', '400', '401');

      expectTestModelContent(responses?.['400']);
      expectTestModelContent(responses?.['401']);
    });

    it('creates multiple error responses for a combined res parameter', () => {
      const responses = specDefault.spec.paths['/GetTest/MultipleStatusCodeRes']?.get?.responses;

      expect(responses).to.have.all.keys('204', '400', '500');

      expectTestModelContent(responses?.['400']);
      expectTestModelContent(responses?.['500']);
    });
  });
});
