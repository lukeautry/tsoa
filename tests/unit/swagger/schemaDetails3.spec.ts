import { expect } from 'chai';
import 'mocha';
import sinon = require('sinon');
import { SwaggerConfig } from '../../../src/config';
import { MetadataGenerator } from '../../../src/metadataGeneration/metadataGenerator';
import { Tsoa } from '../../../src/metadataGeneration/tsoa';
import { SpecGenerator3 } from '../../../src/swagger/specGenerator3';
import { Swagger } from '../../../src/swagger/swagger';
import { getDefaultOptions } from '../../fixtures/defaultOptions';
import { TestModel } from '../../fixtures/duplicateTestModel';
import assert = require('assert');

describe('Definition generation for OpenAPI 3.0.0', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();

  const defaultOptions = getDefaultOptions();
  const optionsWithNoAdditional = Object.assign<{}, SwaggerConfig, Partial<SwaggerConfig>>({}, defaultOptions, {
    noImplicitAdditionalProperties: 'silently-remove-extras',
  });

  interface SpecAndName {
    spec: Swagger.Spec3;
    /**
     * If you want to add another spec here go for it. The reason why we use a string literal is so that tests below won't have "magic string" errors when expected test results differ based on the name of the spec you're testing.
     */
    specName: 'specDefault' | 'specWithNoImplicitExtras';
  }

  const specDefault: SpecAndName = {
    spec: new SpecGenerator3(metadata, defaultOptions).GetSpec(),
    specName: 'specDefault',
  };
  const specWithNoImplicitExtras: SpecAndName = {
    spec: new SpecGenerator3(metadata, optionsWithNoAdditional).GetSpec(),
    specName: 'specWithNoImplicitExtras',
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

    it('setting host to null should result in relative URL', () => {
      const optionsWithHostIsNull = Object.assign<{}, SwaggerConfig, Partial<SwaggerConfig>>({}, defaultOptions, {
        host: null,
      });
      const spec: Swagger.Spec3 = new SpecGenerator3(metadata, optionsWithHostIsNull).GetSpec();

      expect(spec.servers[0].url).to.equal('/v1');
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

      expect(flow.tokenUrl).to.be.undefined;
      expect(flow.authorizationUrl).to.equal('/ats-api/auth/authorization');

      expect(flow.scopes).to.eql({
        user_read: 'user read',
        user_write: 'user_write',
      });
    });
  });

  describe('paths', () => {
    describe('requestBody', () => {
      it('should replace the bodyprop parameter with a requestBody', () => {
        const metadataPost = new MetadataGenerator('./tests/fixtures/controllers/postController.ts').Generate();
        const specPost = new SpecGenerator3(metadataPost, getDefaultOptions()).GetSpec();

        if (!specPost.paths['/PostTest/WithBodyProps']) {
          throw new Error('PostTest/WithBodyProps path not defined.');
        }

        if (!specPost.paths['/PostTest/WithBodyProps'].post) {
          throw new Error('PostTest/WithBodyProps post Method not defined.');
        }

        const method = specPost.paths['/PostTest/WithBodyProps'].post;

        if (!method) {
          throw new Error('Parameters not defined.');
        }

        if (!method.requestBody) {
          throw new Error('Request body not defined.');
        }

        expect(method.requestBody).to.have.all.keys('required', 'content');
        expect(method.requestBody.required).to.be.a('boolean');
        expect(method.requestBody.content).to.be.an('object');

        expect(method.requestBody.content['application/json'].schema!.properties).to.deep.equal({
          model: {
            $ref: '#/components/schemas/TestModel',
            default: undefined,
            description: undefined,
          },
        });
      }),
        it('should replace the body parameter with a requestBody', () => {
          const metadataPost = new MetadataGenerator('./tests/fixtures/controllers/postController.ts').Generate();
          const specPost = new SpecGenerator3(metadataPost, getDefaultOptions()).GetSpec();

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
        const metadataHiddenMethod = new MetadataGenerator('./tests/fixtures/controllers/hiddenMethodController.ts').Generate();
        const specHiddenMethod = new SpecGenerator3(metadataHiddenMethod, getDefaultOptions()).GetSpec();

        expect(specHiddenMethod.paths).to.have.keys(['/Controller/normalGetMethod']);
      });

      it('should not contain paths for hidden controller', () => {
        const metadataHiddenController = new MetadataGenerator('./tests/fixtures/controllers/hiddenController.ts').Generate();
        const specHiddenController = new SpecGenerator3(metadataHiddenController, getDefaultOptions()).GetSpec();

        expect(specHiddenController.paths).to.be.empty;
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
        expect(testModel.properties.optionalString.nullable).to.be.true;
      });
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
        const assertionsPerProperty: Record<keyof TestModel, (propertyName: string, schema: Swagger.Spec) => void> = {
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
                },
                nested: {
                  properties: {
                    additionals: {
                      properties: {},
                      type: 'object',
                      additionalProperties: {
                        $ref: '#/components/schemas/TypeAliasModel1',
                      },
                    },
                    allNestedOptional: {
                      properties: { one: { type: 'string' }, two: { type: 'string' } },
                      type: 'object',
                    },
                    bool: { type: 'boolean' },
                    optional: { format: 'double', type: 'number' },
                  },
                  required: ['allNestedOptional', 'bool'],
                  type: 'object',
                },
              },
              required: ['name'],
              type: 'object',
            });
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
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          enumArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/components/schemas/EnumIndexValue', `for property ${propertyName}.items.$ref`);
          },
          enumNumberValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema.$ref).to.eq('#/components/schemas/EnumNumberValue', `for property ${propertyName}.$ref`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);

            const schema = getComponentSchema('EnumNumberValue', currentSpec);
            expect(schema.type).to.eq('integer');
            expect(schema.enum).to.eql([0, 2, 5]);
          },
          enumStringNumberValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema.$ref).to.eq('#/components/schemas/EnumStringNumberValue', `for property ${propertyName}.$ref`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);

            const schema = getComponentSchema('EnumStringNumberValue', currentSpec);
            expect(schema.type).to.eq('string');
            expect(schema.enum).to.eql(['0', '2', '5']);
          },
          enumStringNumberArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/components/schemas/EnumStringNumberValue', `for property ${propertyName}.items.$ref`);
          },
          enumNumberArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
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
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);

            const schema = getComponentSchema('EnumStringValue', currentSpec);
            expect(schema.type).to.eq('string');
            expect(schema.enum).to.eql(['', 'VALUE_1', 'VALUE_2']);
          },
          enumStringArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
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
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.enum) {
              throw new Error(`There was no 'enum' property on ${propertyName}.`);
            }
            expect(propertySchema.enum).to.have.length(3, `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('Foo', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('Bar', `for property ${propertyName}.enum`);
          },
          strLiteralArr: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.type).to.eq('string', `for property ${propertyName}.items.type`);
            if (!propertySchema.items.enum) {
              throw new Error(`There was no 'enum' property on ${propertyName}.items`);
            }
            expect(propertySchema.items.enum).to.have.length(3, `for property ${propertyName}.items.enum`);
            expect(propertySchema.items.enum).to.include('', `for property ${propertyName}.items.enum`);
            expect(propertySchema.items.enum).to.include('Foo', `for property ${propertyName}.items.enum`);
            expect(propertySchema.items.enum).to.include('Bar', `for property ${propertyName}.items.enum`);
          },
          unionPrimetiveType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
            if (!propertySchema.enum) {
              throw new Error(`There was no 'enum' property on ${propertyName}.`);
            }
            expect(propertySchema.enum).to.have.length(5, `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('String', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('1', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('20', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('true', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('false', `for property ${propertyName}.enum`);
          },
          singleFloatLiteralType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema[`nullable`]).to.eq(true, `for property ${propertyName}[x-nullable]`);
            if (!propertySchema.enum) {
              throw new Error(`There was no 'enum' property on ${propertyName}.`);
            }
            expect(propertySchema.enum).to.have.length(1, `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('3.1415', `for property ${propertyName}.enum`);
          },
          dateValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
            expect(propertySchema.format).to.eq('date-time', `for property ${propertyName}.format`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          optionalString: (propertyName, propertySchema) => {
            // should generate an optional property from an optional property
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema).to.not.haveOwnProperty('format', `for property ${propertyName}`);
          },
          anyType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('object', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
            expect(propertySchema.additionalProperties).to.eq(true, 'because the "any" type always allows more properties be definition');
          },
          unknownType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('object', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
            expect(propertySchema.additionalProperties).to.eq(true, 'because the "unknown" type always allows more properties be definition');
          },
          modelsObjectIndirect: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
          },
          modelsObjectIndirectNS: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModelContainerNamespace.TestSubModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
          },
          modelsObjectIndirectNS2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
          },
          modelsObjectIndirectNS_Alias: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModelContainerNamespace_TestSubModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
          },
          modelsObjectIndirectNS2_Alias: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
          },
          modelsArrayIndirect: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubArrayModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
          },
          modelsEnumIndirect: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubEnumModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
          },
          typeAliasCase1: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TypeAliasModelCase1', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
          },
          TypeAliasCase2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/TypeAliasModelCase2', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
          },
          genericMultiNested: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequestGenericRequestTypeAliasModel1', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayKeyword1: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequestArrayTypeAliasModel1', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayCharacter1: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequestTypeAliasModel1Array', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayKeyword2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequestArrayTypeAliasModel2', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayCharacter2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequestTypeAliasModel2Array', `for property ${propertyName}.$ref`);
          },
          defaultGenericModel: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericModel', `for property ${propertyName}.$ref`);

            const definition = getComponentSchema('GenericModel', currentSpec);
            expect(definition.properties!.result.type).to.deep.equal('string');
            expect(definition.properties!.nested.$ref).to.deep.equal('#/components/schemas/GenericRequeststring');
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
                oneOf: [{ $ref: '#/components/schemas/TypeAliasModel1' }, { $ref: '#/components/schemas/TypeAliasModel2' }],
              },
              `for property ${propertyName}.$ref`,
            );
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          mixedUnion: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.include(
              {
                oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/TypeAliasModel1' }],
              },
              `for property ${propertyName}.$ref`,
            );
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
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
      const swaggerConfig: SwaggerConfig = {
        outputDirectory: 'mockOutputDirectory',
        entryFile: 'mockEntryFile',
      };

      // Act
      let errToTest: Error | null = null;
      try {
        new SpecGenerator3(metadataForEnums, swaggerConfig).GetSpec();
      } catch (err) {
        errToTest = err;
      }

      // Assert
      expect(errToTest!.message).to.eq(`Enums can only have string or number values, but enum ${schemaName} had number,string,object`);
    });

    it('should warn if an enum is mixed with numbers and strings', () => {
      // Arrange
      const spyOfConsoleWarn = sinon.spy(console, 'warn');
      const mixedEnumMetadata = new MetadataGenerator('./tests/fixtures/controllers/mixedEnumController.ts').Generate();

      // Act
      new SpecGenerator3(mixedEnumMetadata, defaultOptions).GetSpec();

      // Assert
      assert(spyOfConsoleWarn.calledWithExactly('Swagger/OpenAPI does not support enums with both strings and numbers but found that for enum MixedStringAndNumberEnum'));
    });
  });
});
