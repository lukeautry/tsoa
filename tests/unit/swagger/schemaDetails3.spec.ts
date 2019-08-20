import { expect } from 'chai';
import 'mocha';
import { SwaggerConfig } from '../../../src/config';
import { MetadataGenerator } from '../../../src/metadataGeneration/metadataGenerator';
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

  interface ISpecAndName {
    spec: Swagger.Spec3;
    /**
     * If you want to add another spec here go for it. The reason why we use a string literal is so that tests below won't have "magic string" errors when expected test results differ based on the name of the spec you're testing.
     */
    specName: 'specDefault' | 'specWithNoImplicitExtras';
  }

  const specDefault: ISpecAndName = {
      spec: new SpecGenerator3(metadata, defaultOptions).GetSpec(),
      specName: 'specDefault',
  };
  const specWithNoImplicitExtras: ISpecAndName = {
    spec: new SpecGenerator3(metadata, optionsWithNoAdditional).GetSpec(),
    specName: 'specWithNoImplicitExtras',
  };

  /**
   * This allows us to iterate over specs that have different options to ensure that certain behavior is consistent
   */
  const allSpecs: ISpecAndName[] = [
    specDefault,
    specWithNoImplicitExtras,
  ];

  function forSpec(chosenSpec: ISpecAndName): string {
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
  });

  describe('security', () => {
    it('should replace the parent securityDefinitions with securitySchemes within components', () => {
      expect(specDefault.spec).to.not.have.property('securityDefinitions');
      expect(specDefault.spec.components.securitySchemes).to.be.ok;
    });

    it('should replace type: basic with type: http and scheme: basic', () => {
      if (!specDefault.spec.components.securitySchemes) { throw new Error('No security schemes.'); }
      if (!specDefault.spec.components.securitySchemes.basic) { throw new Error('No basic security scheme.'); }

      const basic = specDefault.spec.components.securitySchemes.basic as Swagger.BasicSecurity3;

      expect(basic.type).to.equal('http');
      expect(basic.scheme).to.equal('basic');
    });
  });

  describe('paths', () => {
    describe('requestBody', () => {
      it('should replace the body parameter with a requestBody', () => {
        const metadataPost = new MetadataGenerator('./tests/fixtures/controllers/postController.ts').Generate();
        const specPost = new SpecGenerator3(metadataPost, getDefaultOptions()).GetSpec();

        if (!specPost.paths) { throw new Error('Paths are not defined.'); }
        if (!specPost.paths['/PostTest']) { throw new Error('PostTest path not defined.'); }
        if (!specPost.paths['/PostTest'].post) { throw new Error('PostTest post method not defined.'); }

        const method = specPost.paths['/PostTest'].post;

        if (!method || !method.parameters) { throw new Error('Parameters not defined.'); }

        expect(method.parameters).to.deep.equal([]);

        if (!method.requestBody) { throw new Error('Request body not defined.'); }

        expect(method.requestBody.content['application/json'].schema).to.deep.equal({
          $ref: '#/components/schemas/TestModel',
        });
      });
    });
  });

  describe('components', () => {
    describe('schemas', () => {
      it('should replace definitions with schemas', () => {
        if (!specDefault.spec.components.schemas) { throw new Error('Schemas not defined.'); }

        expect(specDefault.spec).to.not.have.property('definitions');
        expect(specDefault.spec.components.schemas.TestModel).to.exist;
      });

      it('should replace x-nullable with nullable', () => {
        if (!specDefault.spec.components.schemas) { throw new Error('Schemas not defined.'); }
        if (!specDefault.spec.components.schemas.TestModel) { throw new Error('TestModel not defined.'); }

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
                    if (!propertySchema.items) { throw new Error(`There was no 'items' property on ${propertyName}.`); }
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
                    if (!propertySchema.items) { throw new Error(`There was no 'items' property on ${propertyName}.`); }
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
                    if (!propertySchema.items) { throw new Error(`There was no 'items' property on ${propertyName}.`); }
                    expect(propertySchema.items.type).to.eq('boolean', `for property ${propertyName}.items.type`);
                    expect(propertySchema.items.default).to.eq(undefined, `for property ${propertyName}.items.default`);
                    expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
                    expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
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
                    if (!propertySchema.items) { throw new Error(`There was no \'items\' property on ${propertyName}.`); }
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
                    if (!propertySchema.items) { throw new Error(`There was no 'items' property on ${propertyName}.`); }
                    expect(propertySchema.items.$ref).to.eq('#/components/schemas/EnumIndexValue', `for property ${propertyName}.items.$ref`);
                },
                enumNumberValue: (propertyName, propertySchema) => {
                    expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
                    expect(propertySchema.$ref).to.eq('#/components/schemas/EnumNumberValue', `for property ${propertyName}.$ref`);
                    expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
                    expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
                },
                enumNumberArray: (propertyName, propertySchema) => {
                    expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
                    expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
                    expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
                    expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
                    if (!propertySchema.items) { throw new Error(`There was no 'items' property on ${propertyName}.`); }
                    expect(propertySchema.items.$ref).to.eq('#/components/schemas/EnumNumberValue', `for property ${propertyName}.items.$ref`);
                },
                enumStringValue: (propertyName, propertySchema) => {
                    expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
                    expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
                    expect(propertySchema.$ref).to.eq('#/components/schemas/EnumStringValue', `for property ${propertyName}.$ref`);
                    expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
                },
                enumStringArray: (propertyName, propertySchema) => {
                    expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
                    expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
                    expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
                    expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
                    if (!propertySchema.items) { throw new Error(`There was no 'items' property on ${propertyName}.`); }
                    expect(propertySchema.items.$ref).to.eq('#/components/schemas/EnumStringValue', `for property ${propertyName}.items.$ref`);
                },
                modelValue: (propertyName, propertySchema) => {
                    expect(propertySchema.$ref).to.eq('#/components/schemas/TestSubModel', `for property ${propertyName}.$ref`);
                    expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
                },
                modelsArray: (propertyName, propertySchema) => {
                    expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
                    expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
                    if (!propertySchema.items) { throw new Error(`There was no 'items' property on ${propertyName}.`); }
                    expect(propertySchema.items.$ref).to.eq('#/components/schemas/TestSubModel', `for property ${propertyName}.items.$ref`);
                },
                strLiteralVal: (propertyName, propertySchema) => {
                    expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
                    expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
                    if (!propertySchema.enum) { throw new Error(`There was no 'enum' property on ${propertyName}.`); }
                    expect(propertySchema.enum).to.have.length(2, `for property ${propertyName}.enum`);
                    expect(propertySchema.enum).to.include('Foo', `for property ${propertyName}.enum`);
                    expect(propertySchema.enum).to.include('Bar', `for property ${propertyName}.enum`);
                },
                strLiteralArr: (propertyName, propertySchema) => {
                    expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
                    expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
                    expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
                    expect(propertySchema.nullable).to.eq(undefined, `for property ${propertyName}.nullable`);
                    if (!propertySchema.items) { throw new Error(`There was no 'items' property on ${propertyName}.`); }
                    expect(propertySchema.items.type).to.eq('string', `for property ${propertyName}.items.type`);
                    if (!propertySchema.items.enum) { throw new Error(`There was no 'enum' property on ${propertyName}.items`); }
                    expect(propertySchema.items.enum).to.have.length(2, `for property ${propertyName}.items.enum`);
                    expect(propertySchema.items.enum).to.include('Foo', `for property ${propertyName}.items.enum`);
                    expect(propertySchema.items.enum).to.include('Bar', `for property ${propertyName}.items.enum`);
                },
                unionPrimetiveType: (propertyName, propertySchema) => {
                    expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
                    expect(propertySchema.nullable).to.eq(true, `for property ${propertyName}.nullable`);
                    if (!propertySchema.enum) { throw new Error(`There was no 'enum' property on ${propertyName}.`); }
                    expect(propertySchema.enum).to.have.length(5, `for property ${propertyName}.enum`);
                    expect(propertySchema.enum).to.include('String', `for property ${propertyName}.enum`);
                    expect(propertySchema.enum).to.include('1', `for property ${propertyName}.enum`);
                    expect(propertySchema.enum).to.include('20', `for property ${propertyName}.enum`);
                    expect(propertySchema.enum).to.include('true', `for property ${propertyName}.enum`);
                    expect(propertySchema.enum).to.include('false', `for property ${propertyName}.enum`);
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
                and: (propertyName, propertySchema) => {
                    expect(propertySchema).to.deep.include({
                        allOf: [
                            { $ref: '#/components/schemas/TypeAliasModel1' },
                            { $ref: '#/components/schemas/TypeAliasModel2' },
                        ],
                    });
                },
                referenceAnd: (propertyName, propertySchema) => {
                    expect(propertySchema).to.deep.include({
                        $ref: '#/components/schemas/TypeAliasModelCase1',
                    });
                },
                or: (propertyName, propertySchema) => {
                    expect(propertySchema).to.deep.include({
                        oneOf: [
                           { $ref: '#/components/schemas/TypeAliasModel1' },
                           { $ref: '#/components/schemas/TypeAliasModel2' },
                        ],
                    });
                },
                mixedUnion: (propertyName, propertySchema) => {
                    expect(propertySchema).to.deep.include({
                        oneOf: [
                           { type: 'string' },
                           { $ref: '#/components/schemas/TypeAliasModel1' },
                        ],
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
                expect(Object.keys(assertionsPerProperty)).to.length(Object.keys(testModel.properties!).length, `because the swagger spec (${currentSpec.specName}) should only produce property schemas for properties that live on the TypeScript interface.`);
            });
        });
    });
  });
});
