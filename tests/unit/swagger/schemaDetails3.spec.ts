import { expect } from 'chai';
import 'mocha';
import { SwaggerConfig } from '../../../src/config';
import { MetadataGenerator } from '../../../src/metadataGeneration/metadataGenerator';
import { Tsoa } from '../../../src/metadataGeneration/tsoa';
import { SpecGenerator3 } from '../../../src/swagger/specGenerator3';
import { Swagger } from '../../../src/swagger/swagger';
import { getDefaultOptions } from '../../fixtures/defaultOptions';
import { TestModel } from '../../fixtures/duplicateTestModel';

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

    it('should have relative URL when no host is defined', () => {
      const optionsWithNoHost = Object.assign<{}, SwaggerConfig>({}, defaultOptions);
      delete optionsWithNoHost.host;

      const spec: Swagger.Spec3 = new SpecGenerator3(metadata, optionsWithNoHost).GetSpec();
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
        expect(testModel.properties.optionalString.nullable).to.be.undefined;
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
                  default: undefined,
                  description: undefined,
                  format: undefined,
                  example: undefined,
                },
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
          },
          enumStringNumberValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema.$ref).to.eq('#/components/schemas/EnumStringNumberValue', `for property ${propertyName}.$ref`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);

            const schema = getComponentSchema('EnumStringNumberValue', currentSpec);
            expect(schema.type).to.eq('string');
            expect(schema.enum).to.eql(['0', '2', '5']);
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
              oneOf: [{ type: 'string', enum: [''], nullable: false }, { type: 'string', enum: ['Foo'], nullable: false }, { type: 'string', enum: ['Bar'], nullable: false }],
              default: undefined,
              description: undefined,
              example: undefined,
              format: undefined,
            });
          },
          strLiteralArr: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema!.items!.$ref).to.eq('#/components/schemas/StrLiteral', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);

            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          unionPrimetiveType: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.eq({
              oneOf: [
                { type: 'string', enum: ['String'], nullable: false },
                { type: 'number', enum: ['1'], nullable: false },
                { type: 'number', enum: ['20'], nullable: false },
                { type: 'boolean', enum: ['true'], nullable: false },
                { type: 'boolean', enum: ['false'], nullable: false },
              ],
              example: undefined,
              default: undefined,
              description: undefined,
              format: undefined,
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
            expect(propertySchema.type).to.eq('object', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema.additionalProperties).to.eq(true, 'because the "any" type always allows more properties be definition');
          },
          unknownType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('object', `for property ${propertyName}`);
            expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
            expect(propertySchema.additionalProperties).to.eq(true, 'because the "unknown" type always allows more properties be definition');
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
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequest_TypeAliasModel1Array_', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayKeyword2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequest_Array_TypeAliasModel2__', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayCharacter2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericRequest_TypeAliasModel2Array_', `for property ${propertyName}.$ref`);
          },
          defaultGenericModel: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/components/schemas/GenericModel', `for property ${propertyName}.$ref`);

            const definition = getComponentSchema('GenericModel', currentSpec);
            expect(definition.properties!.result.type).to.deep.equal('string');
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
              type: 'number',
              format: 'double',
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
              oneOf: [{ $ref: '#/components/schemas/TypeAliasModelCase2' }, { $ref: '#/components/schemas/TypeAliasModel2' }],
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
              oneOf: [{ $ref: '#/components/schemas/GenericAlias_TypeAliasModel1_' }, { type: 'boolean' }],
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
                  excludeLiteral: { $ref: '#/components/schemas/Exclude_keyofTestClassModel.account~OR~defaultValue2_', description: undefined, format: undefined, example: undefined },
                  excludeToInterface: { $ref: '#/components/schemas/Exclude_OneOrTwo.TypeAliasModel1_', description: undefined, format: undefined, example: undefined },
                  excludeTypeToPrimitive: { $ref: '#/components/schemas/NonNullable_number~OR~null_', description: undefined, format: undefined, example: undefined },
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

            const excludeLiteral = getComponentSchema('Exclude_keyofTestClassModel.account~OR~defaultValue2_', currentSpec);
            expect(excludeLiteral).to.deep.eq(
              {
                oneOf: [
                  { type: 'string', enum: ['id'], nullable: false },
                  { type: 'string', enum: ['enumKeys'], nullable: false },
                  { type: 'string', enum: ['keyInterface'], nullable: false },
                  { type: 'string', enum: ['publicStringProperty'], nullable: false },
                  { type: 'string', enum: ['optionalPublicStringProperty'], nullable: false },
                  { type: 'string', enum: ['emailPattern'], nullable: false },
                  { type: 'string', enum: ['stringProperty'], nullable: false },
                  { type: 'string', enum: ['publicConstructorVar'], nullable: false },
                  { type: 'string', enum: ['readonlyConstructorArgument'], nullable: false },
                  { type: 'string', enum: ['optionalPublicConstructorVar'], nullable: false },
                  { type: 'string', enum: ['defaultValue1'], nullable: false },
                ],
                description: 'Exclude from T those types that are assignable to U',
                default: undefined,
                example: undefined,
                format: undefined,
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

            const excludeTypeToPrimitive = getComponentSchema('NonNullable_number~OR~null_', currentSpec);
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

            const readonlyClassSchema = getComponentSchema('Readonly_TestClassModel_', currentSpec);
            expect(readonlyClassSchema).to.deep.eq(
              {
                properties: {
                  defaultValue1: { type: 'string', default: 'Default Value 1', description: undefined, format: undefined, example: undefined },
                  enumKeys: {
                    default: undefined,
                    description: undefined,
                    format: undefined,
                    example: undefined,
                    oneOf: [{ enum: ['OK'], nullable: false, type: 'string' }, { enum: ['KO'], nullable: false, type: 'string' }],
                  },
                  id: { type: 'number', format: 'double', default: undefined, description: undefined, example: undefined },
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
                  oneOf: [{ type: 'number', format: 'double' }, { type: 'number', enum: ['null'], nullable: true }],
                  description: undefined,
                  format: undefined,
                  default: undefined,
                  example: undefined,
                },
                justNull: {
                  default: undefined,
                  description: undefined,
                  example: undefined,
                  enum: ['null'],
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
              { oneOf: [{ type: 'string' }, { type: 'number', enum: ['null'], nullable: true }], description: undefined, default: undefined, example: undefined, format: undefined },
              `for schema linked by property ${propertyName}`,
            );

            const maybeWord = getComponentSchema('Maybe_Word_', currentSpec);
            expect(maybeWord).to.deep.eq(
              { oneOf: [{ $ref: '#/components/schemas/Word' }, { type: 'number', enum: ['null'], nullable: true }], description: undefined, default: undefined, example: undefined, format: undefined },
              `for schema linked by property ${propertyName}`,
            );
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

  describe('Mixed Enums', () => {
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
          },
        },
      };
      const swaggerConfig: SwaggerConfig = {
        outputDirectory: 'mockOutputDirectory',
        entryFile: 'mockEntryFile',
      };

      // Act
      const spec = new SpecGenerator3(metadataForEnums, swaggerConfig).GetSpec();

      // Assert
      expect(getComponentSchema(schemaName, { specName: 'specDefault', spec })).to.deep.eq({
        description: undefined,
        oneOf: [{ type: 'number', enum: [1, 3] }, { type: 'string', enum: ['two', 'four'] }],
      });
    });
  });
});
