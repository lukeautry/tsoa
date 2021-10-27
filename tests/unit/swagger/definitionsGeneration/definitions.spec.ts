import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { Swagger } from '@tsoa/runtime';
import { getDefaultOptions } from '../../../fixtures/defaultOptions';
import { TestModel } from '../../../fixtures/testModel';
import { ExtendedSpecConfig } from '@tsoa/cli/cli';

describe('Definition generation', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/getController.ts').Generate();
  const dynamicMetadata = new MetadataGenerator('./fixtures/controllers/getController.ts', undefined, undefined, ['./fixtures/controllers/getController.ts']).Generate();
  const defaultConfig = getDefaultOptions();
  const defaultOptions: ExtendedSpecConfig = { ...defaultConfig.spec, entryFile: defaultConfig.entryFile, noImplicitAdditionalProperties: 'ignore' };
  const optionsWithNoAdditional = Object.assign<{}, ExtendedSpecConfig, Partial<ExtendedSpecConfig>>({}, defaultOptions, {
    noImplicitAdditionalProperties: 'silently-remove-extras',
  });
  const optionsWithXEnumVarnames = Object.assign<{}, ExtendedSpecConfig, Partial<ExtendedSpecConfig>>({}, defaultOptions, {
    xEnumVarnames: true,
  });
  interface SpecAndName {
    spec: Swagger.Spec2;
    /**
     * If you want to add another spec here go for it. The reason why we use a string literal is so that tests below won't have "magic string" errors when expected test results differ based on the name of the spec you're testing.
     */
    specName: 'specDefault' | 'specWithNoImplicitExtras' | 'dynamicSpecDefault' | 'dynamicSpecWithNoImplicitExtras' | 'specWithXEnumVarnames';
  }

  const specDefault: SpecAndName = {
    spec: new SpecGenerator2(metadata, defaultOptions).GetSpec(),
    specName: 'specDefault',
  };
  const specWithNoImplicitExtras: SpecAndName = {
    spec: new SpecGenerator2(metadata, optionsWithNoAdditional).GetSpec(),
    specName: 'specWithNoImplicitExtras',
  };

  const dynamicSpecDefault: SpecAndName = {
    spec: new SpecGenerator2(dynamicMetadata, defaultOptions).GetSpec(),
    specName: 'dynamicSpecDefault',
  };
  const dynamicSpecWithNoImplicitExtras: SpecAndName = {
    spec: new SpecGenerator2(dynamicMetadata, optionsWithNoAdditional).GetSpec(),
    specName: 'dynamicSpecWithNoImplicitExtras',
  };
  const specWithXEnumVarnames: SpecAndName = {
    spec: new SpecGenerator2(metadata, optionsWithXEnumVarnames).GetSpec(),
    specName: 'specWithXEnumVarnames',
  };
  /**
   * This allows us to iterate over specs that have different options to ensure that certain behavior is consistent
   */
  const allSpecs: SpecAndName[] = [specDefault, specWithNoImplicitExtras, dynamicSpecDefault, dynamicSpecWithNoImplicitExtras];

  const getValidatedDefinition = (name: string, chosenSpec: SpecAndName) => {
    if (!chosenSpec.spec.definitions) {
      throw new Error(`No definitions were generated for ${chosenSpec.specName}.`);
    }

    const definition = chosenSpec.spec.definitions[name];
    if (!definition) {
      throw new Error(`${name} should have been automatically generated in ${chosenSpec.specName}.`);
    }

    return definition;
  };

  function forSpec(chosenSpec: SpecAndName): string {
    return `for the ${chosenSpec.specName} spec`;
  }

  describe('xEnumVarnames', () => {
    it('EnumNumberValue', () => {
      const schema = getValidatedDefinition('EnumNumberValue', specWithXEnumVarnames);
      expect(schema['x-enum-varnames']).to.eql(['VALUE_0', 'VALUE_1', 'VALUE_2']);
    });
    it('EnumStringValue', () => {
      const schema = getValidatedDefinition('EnumStringValue', specWithXEnumVarnames);
      expect(schema['x-enum-varnames']).to.eql(['EMPTY', 'VALUE_1', 'VALUE_2']);
    });
    it('EnumStringNumberValue', () => {
      const schema = getValidatedDefinition('EnumStringNumberValue', specWithXEnumVarnames);
      expect(schema['x-enum-varnames']).to.eql(['VALUE_0', 'VALUE_1', 'VALUE_2']);
    });
  });

  describe('Interface-based generation', () => {
    it('should generate a definition for referenced models', () => {
      allSpecs.forEach(currentSpec => {
        const expectedModels = [
          'TestModel',
          'TestSubModel',
          'Result',
          'TestSubModelContainer',
          'TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2',
          'TestSubModel2',
          'TestSubModelNamespace.TestSubModelNS',
          'TsoaTest.TestModel73',
        ];
        expectedModels.forEach(modelName => {
          getValidatedDefinition(modelName, currentSpec);
        });
      });
    });

    it('should generate a member of type object for union type', () => {
      allSpecs.forEach(currentSpec => {
        const definition = getValidatedDefinition('Result', currentSpec);
        if (!definition.properties) {
          throw new Error(`Definition has no properties ${forSpec(currentSpec)}.`);
        }
        if (!definition.properties.value) {
          throw new Error(`There was no 'value' property ${forSpec(currentSpec)}.`);
        }

        expect(definition.properties.value.type).to.equal('string', forSpec(currentSpec));
        expect(definition.properties.value.enum).to.deep.equal(['success', 'failure'], forSpec(currentSpec));

        if (currentSpec.specName === 'specWithNoImplicitExtras' || currentSpec.specName === 'dynamicSpecWithNoImplicitExtras') {
          expect(definition.additionalProperties).to.eq(false, forSpec(currentSpec));
        } else {
          expect(definition.additionalProperties).to.eq(true, forSpec(currentSpec));
        }
      });
    });

    it('should generate a member of type object for union type', () => {
      allSpecs.forEach(currentSpec => {
        const definition = getValidatedDefinition('TestModel', currentSpec);
        if (!definition.properties) {
          throw new Error('Definition has no properties.');
        }
        if (!definition.properties.or) {
          throw new Error("There was no 'or' property.");
        }

        expect(definition.properties.or.type).to.equal('object');
      });
    });

    it('should generate a member of type object for intersection type', () => {
      allSpecs.forEach(currentSpec => {
        const definition = getValidatedDefinition('TestModel', currentSpec);
        if (!definition.properties) {
          throw new Error('Definition has no properties.');
        }
        if (!definition.properties.and) {
          throw new Error("There was no 'and' property.");
        }

        expect(definition.properties.and.type).to.equal('object');
      });
    });

    it('should generate a correct definition for models in namespaces in modules', () => {
      allSpecs.forEach(currentSpec => {
        const namespaceInModule = getValidatedDefinition('TsoaTest.TestModel73', currentSpec);

        expect(namespaceInModule).to.deep.include({
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

    describe('should generate a schema for every property on the TestModel interface', () => {
      const interfaceName = 'TestModel';
      allSpecs.forEach(currentSpec => {
        const definition = getValidatedDefinition(interfaceName, currentSpec);

        it('should produce schemas for the properties and should make a choice about additionalProperties', () => {
          if (!definition.properties) {
            throw new Error('Definition has no properties.');
          }

          if (currentSpec.specName === 'specWithNoImplicitExtras' || currentSpec.specName === 'dynamicSpecWithNoImplicitExtras') {
            expect(definition.additionalProperties).to.eq(false, forSpec(currentSpec));
          } else {
            expect(definition.additionalProperties).to.eq(true, forSpec(currentSpec));
          }
        });
        /**
         * By creating a record of "keyof T" we ensure that contributors will need add a test for any new property that is added to the model
         */
        const assertionsPerProperty: Record<keyof TestModel, (propertyName: string, schema: Swagger.Schema2) => void> = {
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
          // tslint:disable-next-line: object-literal-sort-keys
          numberArrayReadonly: (propertyName, propertySchema) => {
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
            expect(propertySchema.example).to.eq('letmein', `for property ${propertyName}.example`);
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
          object: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('object', `for property ${propertyName}`);
            if (currentSpec.specName === 'specWithNoImplicitExtras' || currentSpec.specName === 'dynamicSpecWithNoImplicitExtras') {
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
            if (currentSpec.specName === 'specWithNoImplicitExtras' || currentSpec.specName === 'dynamicSpecWithNoImplicitExtras') {
              expect(itemsAsSchema.additionalProperties).to.eq(false, forSpec(currentSpec));
            } else {
              expect(itemsAsSchema.additionalProperties).to.eq(true, forSpec(currentSpec));
            }
          },
          enumValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema.$ref).to.eq('#/definitions/EnumIndexValue', `for property ${propertyName}.$ref`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          enumArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/definitions/EnumIndexValue', `for property ${propertyName}.items.$ref`);
          },
          enumNumberValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema.$ref).to.eq('#/definitions/EnumNumberValue', `for property ${propertyName}.$ref`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);

            const validatedDefinition = getValidatedDefinition('EnumNumberValue', currentSpec);
            expect(validatedDefinition.type).to.eq('number');
            const expectedEnumValues = [0, 2, 5];
            expect(validatedDefinition.enum).to.eql(expectedEnumValues, `for property ${propertyName}[enum]`);
          },
          enumStringNumberValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema.$ref).to.eq('#/definitions/EnumStringNumberValue', `for property ${propertyName}.$ref`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);

            const validatedDefinition = getValidatedDefinition('EnumStringNumberValue', currentSpec);
            expect(validatedDefinition.type).to.eq('string');
            const expectedEnumValues = ['0', '2', '5'];
            expect(validatedDefinition.enum).to.eql(expectedEnumValues, `for property ${propertyName}[enum]`);
          },
          enumStringNumberArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/definitions/EnumStringNumberValue', `for property ${propertyName}.items.$ref`);
          },
          enumNumberArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/definitions/EnumNumberValue', `for property ${propertyName}.items.$ref`);
          },
          enumStringValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}.type`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema.$ref).to.eq('#/definitions/EnumStringValue', `for property ${propertyName}.$ref`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);

            const validatedDefinition = getValidatedDefinition('EnumStringValue', currentSpec);
            expect(validatedDefinition.type).to.eq('string');
            const expectedEnumValues = ['', 'VALUE_1', 'VALUE_2'];
            expect(validatedDefinition.enum).to.eql(expectedEnumValues, `for property ${propertyName}[enum]`);
            expect(validatedDefinition['x-enum-varnames']).to.eq(undefined);
          },
          enumStringProperty: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/EnumStringValue.VALUE_1');
            const schema = getValidatedDefinition('EnumStringValue.VALUE_1', currentSpec);
            expect(schema).to.deep.eq({
              description: undefined,
              enum: ['VALUE_1'],
              type: 'string',
            });
          },
          enumStringArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/definitions/EnumStringValue', `for property ${propertyName}.items.$ref`);
          },
          modelValue: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/TestSubModel', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          modelsArray: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.$ref).to.eq('#/definitions/TestSubModel', `for property ${propertyName}.items.$ref`);
          },
          strLiteralVal: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/StrLiteral', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);

            const validatedDefinition = getValidatedDefinition('StrLiteral', currentSpec);
            expect(validatedDefinition.type).to.eq('string', `for property ${propertyName}.type`);
            expect(validatedDefinition).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            if (!validatedDefinition.enum) {
              throw new Error(`There was no 'enum' property on ${propertyName}.`);
            }
            expect(validatedDefinition.enum).to.have.length(3, `for property ${propertyName}.enum`);
            expect(validatedDefinition.enum).to.include('', `for property ${propertyName}.enum`);
            expect(validatedDefinition.enum).to.include('Foo', `for property ${propertyName}.enum`);
            expect(validatedDefinition.enum).to.include('Bar', `for property ${propertyName}.enum`);
            expect(validatedDefinition['x-nullable']).to.eq(false, `for property ${propertyName}[x-nullable]`);
          },
          strLiteralArr: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            expect(propertySchema.items!.$ref).to.eq('#/definitions/StrLiteral', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);

            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          unionPrimitiveType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema['x-nullable']).to.eq(false, `for property ${propertyName}[x-nullable]`);
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
          nullableUnionPrimitiveType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema['x-nullable']).to.eq(true, `for property ${propertyName}[x-nullable]`);
            if (!propertySchema.enum) {
              throw new Error(`There was no 'enum' property on ${propertyName}.`);
            }
            expect(propertySchema.enum).to.have.length(6, `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('String', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('1', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('20', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('true', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include('false', `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include(null, `for property ${propertyName}.enum`);
          },
          singleFloatLiteralType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('number', `for property ${propertyName}.type`);
            expect(propertySchema['x-nullable']).to.eq(false, `for property ${propertyName}[x-nullable]`);
            if (!propertySchema.enum) {
              throw new Error(`There was no 'enum' property on ${propertyName}.`);
            }
            expect(propertySchema.enum).to.have.length(1, `for property ${propertyName}.enum`);
            expect(propertySchema.enum).to.include(3.1415, `for property ${propertyName}.enum`);
          },
          dateValue: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema.format).to.eq('date-time', `for property ${propertyName}.format`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          optionalString: (propertyName, propertySchema) => {
            // should generate an optional property from an optional property
            expect(propertySchema.type).to.eq('string', `for property ${propertyName}.type`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema).to.not.haveOwnProperty('format', `for property ${propertyName}`);
          },
          anyType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema.additionalProperties).to.eq(true, 'because the "unknown" type always allows more properties be definition');
          },
          unknownType: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq(undefined, `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
            expect(propertySchema.additionalProperties).to.eq(true, 'because the "any" type always allows more properties be definition');
          },
          genericTypeObject: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/Generic__foo-string--bar-boolean__');
          },
          indexed: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/Partial_Indexed-at-foo_');
          },
          record: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/Record_record-foo-or-record-bar._data-string__');
            const schema = getValidatedDefinition('Record_record-foo-or-record-bar._data-string__', currentSpec);
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
            expect(propertySchema.$ref).to.eq('#/definitions/TestSubModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          modelsObjectIndirectNS: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/TestSubModelContainerNamespace.TestSubModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          modelsObjectIndirectNS2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          modelsObjectIndirectNS_Alias: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/TestSubModelContainerNamespace_TestSubModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          modelsObjectIndirectNS2_Alias: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          modelsArrayIndirect: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/TestSubArrayModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          modelsEnumIndirect: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/TestSubEnumModelContainer', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          typeAliasCase1: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/TypeAliasModelCase1', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          TypeAliasCase2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/TypeAliasModelCase2', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
            expect(propertySchema['x-nullable']).to.eq(undefined, `for property ${propertyName}[x-nullable]`);
          },
          genericMultiNested: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/GenericRequest_GenericRequest_TypeAliasModel1__', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayKeyword1: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/GenericRequest_Array_TypeAliasModel1__', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayCharacter1: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/GenericRequest_TypeAliasModel1-Array_', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayKeyword2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/GenericRequest_Array_TypeAliasModel2__', `for property ${propertyName}.$ref`);
          },
          genericNestedArrayCharacter2: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/GenericRequest_TypeAliasModel2-Array_', `for property ${propertyName}.$ref`);
          },
          defaultGenericModel: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/GenericModel', `for property ${propertyName}.$ref`);

            const definition = getValidatedDefinition('GenericModel', currentSpec);
            expect(definition.properties!.result.type).to.deep.equal('string');
            expect(definition.properties!.nested.$ref).to.deep.equal('#/definitions/GenericRequest_string_');
          },
          and: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('object', `for property ${propertyName}`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          referenceAnd: (propertyName, propertySchema) => {
            expect(propertySchema.$ref).to.eq('#/definitions/TypeAliasModelCase1', `for property ${propertyName}.$ref`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          or: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('object', `for property ${propertyName}`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          mixedUnion: (propertyName, propertySchema) => {
            expect(propertySchema.type).to.eq('object', `for property ${propertyName}`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          objLiteral: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.equal({
              default: undefined,
              description: undefined,
              format: undefined,
              example: undefined,
              properties: {
                name: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                deprecatedSubProperty: { type: 'number', default: undefined, description: undefined, format: 'double', example: undefined, 'x-deprecated': true },
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
                        $ref: '#/definitions/TypeAliasModel1',
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
                    optional: { type: 'number', format: 'double', default: undefined, description: undefined, example: undefined },
                  },
                  default: undefined,
                  description: undefined,
                  format: undefined,
                  example: undefined,
                  required: ['allNestedOptional', 'bool'],
                  type: 'object',
                },
              },
              required: ['name'],
              type: 'object',
            });
          },
          notDeprecatedProperty: (propertyName, propertySchema) => {
            expect(propertySchema).not.to.haveOwnProperty('x-deprecated', `for property ${propertyName}`);
          },
          propertyOfDeprecatedType: (propertyName, propertySchema) => {
            // property is not explicitly deprecated, but the type's schema is
            expect(propertySchema).not.to.haveOwnProperty('x-deprecated', `for property ${propertyName}`);
            const typeSchema = getValidatedDefinition('DeprecatedType', currentSpec);
            expect(typeSchema['x-deprecated']).to.eq(true, `for DeprecatedType`);
          },
          propertyOfDeprecatedClass: (propertyName, propertySchema) => {
            // property is not explicitly deprecated, but the type's schema is
            expect(propertySchema).not.to.haveOwnProperty('x-deprecated', `for property ${propertyName}`);
            const typeSchema = getValidatedDefinition('DeprecatedClass', currentSpec);
            expect(typeSchema['x-deprecated']).to.eq(true, `for DeprecatedClass`);
          },
          deprecatedProperty: (propertyName, propertySchema) => {
            expect(propertySchema['x-deprecated']).to.eq(true, `for property ${propertyName}[x-deprecated]`);
          },
          deprecatedFieldsOnInlineMappedTypeFromSignature: (propertyName, propertySchema) => {
            expect(propertySchema.properties!.okProp['x-deprecated']).to.eql(undefined, `for property okProp[x-deprecated]`);
            expect(propertySchema.properties!.notOkProp['x-deprecated']).to.eql(true, `for property notOkProp[x-deprecated]`);
          },
          deprecatedFieldsOnInlineMappedTypeFromDeclaration: (propertyName, propertySchema) => {
            expect(propertySchema.properties!.okProp['x-deprecated']).to.eql(undefined, `for property okProp[x-deprecated]`);
            expect(propertySchema.properties!.notOkProp['x-deprecated']).to.eql(true, `for property notOkProp[x-deprecated]`);
            expect(propertySchema.properties!.stillNotOkProp['x-deprecated']).to.eql(true, `for property stillNotOkProp[x-deprecated]`);
          },
          notDeprecatedFieldsOnInlineMappedTypeWithIndirection: (propertyName, propertySchema) => {
            expect(propertySchema.properties!.notOk).not.to.haveOwnProperty('x-deprecated', `for property notOk`);
          },
          typeAliases: (propertyName, propertySchema) => {
            expect(propertyName).to.equal('typeAliases');
            expect(propertySchema).to.deep.equal({
              default: undefined,
              description: undefined,
              example: undefined,
              format: undefined,
              properties: {
                word: { $ref: '#/definitions/Word', description: undefined, format: undefined, example: undefined },
                fourtyTwo: { $ref: '#/definitions/FourtyTwo', description: undefined, format: undefined, example: undefined },
                dateAlias: { $ref: '#/definitions/DateAlias', description: undefined, format: undefined, example: undefined },
                unionAlias: { $ref: '#/definitions/UnionAlias', description: undefined, format: undefined, example: undefined },
                intersectionAlias: { $ref: '#/definitions/IntersectionAlias', description: undefined, format: undefined, example: undefined },
                nOLAlias: { $ref: '#/definitions/NolAlias', description: undefined, format: undefined, example: undefined },
                genericAlias: { $ref: '#/definitions/GenericAlias_string_', description: undefined, format: undefined, example: undefined },
                genericAlias2: { $ref: '#/definitions/GenericAlias_Model_', description: undefined, format: undefined, example: undefined },
                forwardGenericAlias: { $ref: '#/definitions/ForwardGenericAlias_boolean.TypeAliasModel1_', description: undefined, format: undefined, example: undefined },
              },
              required: ['forwardGenericAlias', 'genericAlias2', 'genericAlias', 'nOLAlias', 'intersectionAlias', 'unionAlias', 'fourtyTwo', 'word'],
              type: 'object',
            });

            const wordSchema = getValidatedDefinition('Word', currentSpec);
            expect(wordSchema).to.deep.eq({ type: 'string', description: 'A Word shall be a non-empty sting', example: undefined, default: undefined, minLength: 1, format: 'password' });

            const fourtyTwoSchema = getValidatedDefinition('FourtyTwo', currentSpec);
            expect(fourtyTwoSchema).to.deep.eq({
              type: 'integer',
              format: 'int32',
              description: 'The number 42 expressed through OpenAPI',
              example: 42,
              minimum: 42,
              maximum: 42,
              default: '42',
            });

            const dateAliasSchema = getValidatedDefinition('DateAlias', currentSpec);
            expect(dateAliasSchema).to.deep.eq({ type: 'string', format: 'date', description: undefined, example: undefined, default: undefined });

            const unionAliasSchema = getValidatedDefinition('UnionAlias', currentSpec);
            expect(unionAliasSchema).to.deep.eq({
              type: 'object',
              description: undefined,
              example: undefined,
              default: undefined,
              format: undefined,
            });

            const intersectionAliasSchema = getValidatedDefinition('IntersectionAlias', currentSpec);
            expect(intersectionAliasSchema).to.deep.eq({
              type: 'object',
              properties: {
                value1: {
                  type: 'string',
                },
              },
              description: undefined,
              example: undefined,
              default: undefined,
              format: undefined,
            });

            const nolAliasSchema = getValidatedDefinition('NolAlias', currentSpec);
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

            const genericAliasStringSchema = getValidatedDefinition('GenericAlias_string_', currentSpec);
            expect(genericAliasStringSchema).to.deep.eq({ type: 'string', description: undefined, example: undefined, default: undefined, format: undefined });

            const genericAliasModelSchema = getValidatedDefinition('GenericAlias_Model_', currentSpec);
            expect(genericAliasModelSchema).to.deep.eq({ $ref: '#/definitions/Model', description: undefined, example: undefined, default: undefined, format: undefined });

            const forwardGenericAliasBooleanAndTypeAliasModel1Schema = getValidatedDefinition('ForwardGenericAlias_boolean.TypeAliasModel1_', currentSpec);
            expect(forwardGenericAliasBooleanAndTypeAliasModel1Schema).to.deep.eq({
              type: 'object',
              description: undefined,
              example: undefined,
              default: undefined,
              format: undefined,
            });

            expect(getValidatedDefinition('GenericAlias_TypeAliasModel1_', currentSpec)).to.deep.eq({
              $ref: '#/definitions/TypeAliasModel1',
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
                  omit: { $ref: '#/definitions/Omit_ErrorResponseModel.status_', description: undefined, format: undefined, example: undefined },
                  omitHidden: { $ref: '#/definitions/Omit_PrivateModel.stringPropDec1_', description: undefined, format: undefined, example: undefined },
                  partial: { $ref: '#/definitions/Partial_Account_', description: undefined, format: undefined, example: undefined },
                  excludeToEnum: { $ref: '#/definitions/Exclude_EnumUnion.EnumNumberValue_', description: undefined, format: undefined, example: undefined },
                  excludeToAlias: { $ref: '#/definitions/Exclude_ThreeOrFour.TypeAliasModel3_', description: undefined, format: undefined, example: undefined },
                  excludeLiteral: {
                    $ref:
                      '#/definitions/Exclude_keyofTestClassModel.account-or-defaultValue2-or-indexedTypeToInterface-or-indexedTypeToClass-or-indexedTypeToAlias-or-indexedResponseObject-or-arrayUnion-or-objectUnion_',
                    description: undefined,
                    format: undefined,
                    example: undefined,
                  },
                  excludeToInterface: { $ref: '#/definitions/Exclude_OneOrTwo.TypeAliasModel1_', description: undefined, format: undefined, example: undefined },
                  excludeTypeToPrimitive: { $ref: '#/definitions/NonNullable_number-or-null_', description: undefined, format: undefined, example: undefined },
                  pick: { $ref: '#/definitions/Pick_ThingContainerWithTitle_string_.list_', description: undefined, format: undefined, example: undefined },
                  readonlyClass: { $ref: '#/definitions/Readonly_TestClassModel_', description: undefined, format: undefined, example: undefined },
                  defaultArgs: { $ref: '#/definitions/DefaultTestModel', description: undefined, format: undefined, example: undefined },
                  heritageCheck: { $ref: '#/definitions/HeritageTestModel', description: undefined, format: undefined, example: undefined },
                },
                type: 'object',
                default: undefined,
                example: undefined,
                description: undefined,
                format: undefined,
              },
              `for property ${propertyName}`,
            );

            const omit = getValidatedDefinition('Omit_ErrorResponseModel.status_', currentSpec);
            expect(omit).to.deep.eq(
              {
                $ref: '#/definitions/Pick_ErrorResponseModel.Exclude_keyofErrorResponseModel.status__',
                description: 'Construct a type with the properties of T except for those in type K.',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for definition linked by ${propertyName}`,
            );

            const omitReference = getValidatedDefinition('Pick_ErrorResponseModel.Exclude_keyofErrorResponseModel.status__', currentSpec);
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
              `for definition linked by ${propertyName}`,
            );

            const omitHidden = getValidatedDefinition('Omit_PrivateModel.stringPropDec1_', currentSpec);
            expect(omitHidden).to.deep.eq(
              {
                $ref: '#/definitions/Pick_PrivateModel.Exclude_keyofPrivateModel.stringPropDec1__',
                description: 'Construct a type with the properties of T except for those in type K.',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for a schema linked by property ${propertyName}`,
            );

            const omitHiddenReference = getValidatedDefinition('Pick_PrivateModel.Exclude_keyofPrivateModel.stringPropDec1__', currentSpec);
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

            const partial = getValidatedDefinition('Partial_Account_', currentSpec);
            expect(partial).to.deep.eq(
              {
                properties: { id: { type: 'number', format: 'double', default: undefined, description: undefined, example: undefined } },
                type: 'object',
                description: 'Make all properties in T optional',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for definition linked by ${propertyName}`,
            );

            const excludeToEnum = getValidatedDefinition('Exclude_EnumUnion.EnumNumberValue_', currentSpec);
            expect(excludeToEnum).to.deep.eq(
              {
                $ref: '#/definitions/EnumIndexValue',
                description: 'Exclude from T those types that are assignable to U',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for definition linked by ${propertyName}`,
            );

            const excludeToAlias = getValidatedDefinition('Exclude_ThreeOrFour.TypeAliasModel3_', currentSpec);
            expect(excludeToAlias).to.deep.eq(
              {
                $ref: '#/definitions/TypeAlias4',
                description: 'Exclude from T those types that are assignable to U',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for definition linked by ${propertyName}`,
            );

            const excludeToAliasTypeAlias4 = getValidatedDefinition('TypeAlias4', currentSpec);
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
              `for definition linked by ${propertyName}`,
            );

            const excludeLiteral = getValidatedDefinition(
              'Exclude_keyofTestClassModel.account-or-defaultValue2-or-indexedTypeToInterface-or-indexedTypeToClass-or-indexedTypeToAlias-or-indexedResponseObject-or-arrayUnion-or-objectUnion_',
              currentSpec,
            );
            expect(excludeLiteral).to.deep.eq(
              {
                type: 'string',
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
                  'extensionTest',
                  'extensionComment',
                  'stringExample',
                  'objectExample',
                  'publicConstructorVar',
                  'readonlyConstructorArgument',
                  'optionalPublicConstructorVar',
                  'deprecatedPublicConstructorVar',
                  'deprecatedPublicConstructorVar2',
                  'myIgnoredMethod',
                  'defaultValue1',
                ],
                description: 'Exclude from T those types that are assignable to U',
                default: undefined,
                example: undefined,
                format: undefined,
                ['x-nullable']: false,
              },
              `for definition linked by ${propertyName}`,
            );

            const excludeToInterface = getValidatedDefinition('Exclude_OneOrTwo.TypeAliasModel1_', currentSpec);
            expect(excludeToInterface).to.deep.eq(
              {
                $ref: '#/definitions/TypeAliasModel2',
                description: 'Exclude from T those types that are assignable to U',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for definition linked by ${propertyName}`,
            );

            const excludeTypeToPrimitive = getValidatedDefinition('NonNullable_number-or-null_', currentSpec);
            expect(excludeTypeToPrimitive).to.deep.eq(
              {
                type: 'number',
                format: 'double',
                default: undefined,
                example: undefined,
                description: 'Exclude null and undefined from T',
              },
              `for definition linked by ${propertyName}`,
            );

            const pick = getValidatedDefinition('Pick_ThingContainerWithTitle_string_.list_', currentSpec);
            expect(pick).to.deep.eq(
              {
                properties: {
                  list: {
                    items: { $ref: '#/definitions/ThingContainerWithTitle_string_' },
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
              `for definition linked by ${propertyName}`,
            );

            const customRecord = getValidatedDefinition('Record_id.string_', currentSpec);
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

            const readonlyClassSchema = getValidatedDefinition('Readonly_TestClassModel_', currentSpec);
            expect(readonlyClassSchema).to.deep.eq(
              {
                properties: {
                  defaultValue1: { type: 'string', default: 'Default Value 1', description: undefined, format: undefined, example: undefined },
                  enumKeys: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined, enum: ['OK', 'KO'], 'x-nullable': false },
                  id: { type: 'number', format: 'double', default: undefined, description: undefined, example: undefined },
                  indexedResponse: {
                    $ref: '#/definitions/Record_id.string_',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                  },
                  indexedResponseObject: {
                    $ref: '#/definitions/Record_id.any_',
                    description: undefined,
                    example: undefined,
                    format: undefined,
                  },
                  indexedType: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined },
                  indexedTypeToAlias: { $ref: '#/definitions/IndexedInterfaceAlias', description: undefined, format: undefined, example: undefined },
                  indexedTypeToClass: { $ref: '#/definitions/IndexedClass', description: undefined, format: undefined, example: undefined },
                  indexedTypeToInterface: { $ref: '#/definitions/IndexedInterface', description: undefined, format: undefined, example: undefined },
                  keyInterface: { type: 'string', default: undefined, description: undefined, format: undefined, example: undefined, 'x-nullable': false, enum: ['id'] },
                  arrayUnion: {
                    default: undefined,
                    description: undefined,
                    enum: ['foo', 'bar'],
                    example: undefined,
                    format: undefined,
                    type: 'string',
                    'x-nullable': false,
                  },
                  objectUnion: {
                    default: undefined,
                    description: undefined,
                    enum: ['foo', 'bar'],
                    example: undefined,
                    format: undefined,
                    type: 'string',
                    'x-nullable': false,
                  },
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
                  account: { $ref: '#/definitions/Account', format: undefined, description: undefined, example: undefined },
                  deprecated1: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined, 'x-deprecated': true },
                  deprecated2: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined, 'x-deprecated': true },
                  extensionTest: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined, 'x-key-1': 'value-1', 'x-key-2': 'value-2' },
                  extensionComment: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined, 'x-key-1': 'value-1', 'x-key-2': 'value-2' },
                  stringExample: { type: 'string', default: undefined, description: undefined, format: undefined, example: 'stringValue' },
                  objectExample: {
                    type: 'object',
                    default: undefined,
                    description: undefined,
                    format: undefined,
                    example: {
                      id: 1,
                      label: 'labelValue',
                    },
                    properties: {
                      id: {
                        default: undefined,
                        description: undefined,
                        example: undefined,
                        format: 'double',
                        type: 'number',
                      },
                      label: {
                        default: undefined,
                        description: undefined,
                        example: undefined,
                        format: undefined,
                        type: 'string',
                      },
                    },
                    required: ['label', 'id'],
                  },
                  deprecatedPublicConstructorVar: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined, 'x-deprecated': true },
                  deprecatedPublicConstructorVar2: { type: 'boolean', default: undefined, description: undefined, format: undefined, example: undefined, 'x-deprecated': true },
                },
                required: ['account', 'enumKeys', 'publicStringProperty', 'stringProperty', 'publicConstructorVar', 'readonlyConstructorArgument', 'id'],
                type: 'object',
                description: 'Make all properties in T readonly',
                default: undefined,
                example: undefined,
                format: undefined,
              },
              `for definition linked by ${propertyName}`,
            );

            const indexedTypeToClass = getValidatedDefinition('IndexedClass', currentSpec);
            expect(indexedTypeToClass).to.deep.eq({
              additionalProperties: currentSpec.specName === 'specWithNoImplicitExtras' || currentSpec.specName === 'dynamicSpecWithNoImplicitExtras' ? false : true,
              description: undefined,
              properties: {
                foo: {
                  default: undefined,
                  description: undefined,
                  enum: ['bar'],
                  example: undefined,
                  format: undefined,
                  type: 'string',
                  'x-nullable': false,
                },
              },
              required: ['foo'],
              type: 'object',
            });

            const indexedTypeToInterface = getValidatedDefinition('IndexedInterface', currentSpec);
            expect(indexedTypeToInterface).to.deep.eq({
              additionalProperties: currentSpec.specName === 'specWithNoImplicitExtras' || currentSpec.specName === 'dynamicSpecWithNoImplicitExtras' ? false : true,
              description: undefined,
              properties: {
                foo: {
                  default: undefined,
                  description: undefined,
                  enum: ['bar'],
                  example: undefined,
                  format: undefined,
                  type: 'string',
                  'x-nullable': false,
                },
              },
              required: ['foo'],
              type: 'object',
            });

            const defaultArgs = getValidatedDefinition('DefaultTestModel', currentSpec);
            expect(defaultArgs).to.deep.eq(
              {
                description: undefined,
                properties: {
                  t: { $ref: '#/definitions/GenericRequest_Word_', description: undefined, format: undefined, example: undefined },
                  u: { $ref: '#/definitions/DefaultArgs_Omit_ErrorResponseModel.status__', description: undefined, format: undefined, example: undefined },
                },
                required: ['t', 'u'],
                type: 'object',
                additionalProperties: currentSpec.specName === 'specWithNoImplicitExtras' || currentSpec.specName === 'dynamicSpecWithNoImplicitExtras' ? false : true,
              },
              `for schema linked by property ${propertyName}`,
            );

            const heritageCheck = getValidatedDefinition('HeritageTestModel', currentSpec);
            expect(heritageCheck).to.deep.eq(
              {
                properties: {
                  name: {
                    default: undefined,
                    description: undefined,
                    format: undefined,
                    example: undefined,
                    type: 'string',
                  },
                  value4: {
                    default: undefined,
                    description: undefined,
                    format: undefined,
                    example: undefined,
                    type: 'string',
                  },
                },
                required: ['value4'],
                type: 'object',
                additionalProperties: currentSpec.specName === 'specWithNoImplicitExtras' || currentSpec.specName === 'dynamicSpecWithNoImplicitExtras' ? false : true,
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
                maybeString: { $ref: '#/definitions/Maybe_string_', description: undefined, format: undefined, example: undefined },
                wordOrNull: { $ref: '#/definitions/Maybe_Word_', description: undefined, format: undefined, example: undefined },
                numberOrNull: { type: 'number', format: 'double', description: undefined, default: undefined, ['x-nullable']: true, example: undefined },
                justNull: {
                  default: undefined,
                  description: undefined,
                  enum: [null],
                  format: undefined,
                  example: undefined,
                  type: 'number',
                  ['x-nullable']: true,
                },
              },
              required: ['justNull', 'maybeString', 'wordOrNull', 'numberOrNull'],
              type: 'object',
            });

            const maybeString = getValidatedDefinition('Maybe_string_', currentSpec);
            expect(maybeString).to.deep.eq(
              { type: 'string', description: undefined, format: undefined, example: undefined, default: undefined, ['x-nullable']: true },
              `for schema linked by property ${propertyName}`,
            );

            const maybeWord = getValidatedDefinition('Maybe_Word_', currentSpec);
            expect(maybeWord).to.deep.eq({ type: 'object', description: undefined, example: undefined, default: undefined, format: undefined }, `for schema linked by property ${propertyName}`);
          },
          templateLiteralString: (properyName, propertySchema) => {
            expect(propertySchema).to.deep.eq({ $ref: '#/definitions/TemplateLiteralString', description: undefined, example: undefined, format: undefined });

            const tlsSchema = getValidatedDefinition('TemplateLiteralString', currentSpec);

            expect(tlsSchema).to.deep.eq({ $ref: '#/definitions/OrderOptions_ParameterTestModel_', default: undefined, example: undefined, format: undefined, description: undefined });

            const orderOptionsSchema = getValidatedDefinition('OrderOptions_ParameterTestModel_', currentSpec);

            expect(orderOptionsSchema).to.deep.eq({
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
              'x-nullable': false,
            });
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
                'x-nullable': false,
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
            expect(propertySchema.type).to.eq('array', `for property ${propertyName}.type`);
            if (!propertySchema.items) {
              throw new Error(`There was no 'items' property on ${propertyName}.`);
            }
            expect(propertySchema.items.type).to.eq('object', `for property ${propertyName}.items.type`);
            expect(propertySchema.items.format).to.eq(undefined, `for property ${propertyName}.items.format`);
            expect(propertySchema.description).to.eq(undefined, `for property ${propertyName}.description`);
            expect(propertySchema).to.not.haveOwnProperty('additionalProperties', `for property ${propertyName}`);
          },
          extensionComment: (propertyName, propertySchema) => {
            expect(propertySchema).to.deep.eq(
              {
                type: 'boolean',
                default: undefined,
                description: undefined,
                format: undefined,
                example: undefined,
                'x-key-1': 'value-1',
                'x-key-2': 'value-2',
              },
              `for property ${propertyName}`,
            );
          },
        };

        Object.keys(assertionsPerProperty).forEach(aPropertyName => {
          const propertySchema = definition.properties![aPropertyName];
          if (!propertySchema) {
            throw new Error(`There was no ${aPropertyName} schema generated for the ${currentSpec.specName}`);
          }
          it(`should produce a valid schema for the ${aPropertyName} property on ${interfaceName} for the ${currentSpec.specName}`, () => {
            assertionsPerProperty[aPropertyName](aPropertyName, propertySchema);
          });
        });

        expect(Object.keys(assertionsPerProperty)).to.length(
          Object.keys(definition.properties!).length,
          `because the swagger spec (${currentSpec.specName}) should only produce property schemas for properties that live on the TypeScript interface.`,
        );
      });
    });

    allSpecs.forEach(currentSpec => {
      describe(`for spec ${currentSpec.specName}`, () => {
        it('should generate a definition description from a model jsdoc comment', () => {
          const definition = getValidatedDefinition('TestModel', currentSpec);
          expect(definition.description).to.equal('This is a description of a model');
        });

        it('should generate single first example from jsdoc', () => {
          const definition = getValidatedDefinition('TestModel', currentSpec);
          if (!definition.example) {
            throw new Error('No definition example.');
          }

          expect(definition.example).to.deep.equal({
            boolArray: [true, false],
            boolValue: true,
            dateValue: '2018-06-25T15:45:00Z',
            id: 2,
            modelValue: {
              id: 3,
              email: 'test(at)example.com',
            },
            modelsArray: [],
            numberArray: [1, 2, 3],
            numberArrayReadonly: [1, 2, 3],
            numberValue: 1,
            optionalString: 'optional string',
            strLiteralArr: ['Foo', 'Bar'],
            strLiteralVal: 'Foo',
            stringArray: ['string one', 'string two'],
            stringValue: 'a string',
          });
        });
      });
    });

    allSpecs.forEach(currentSpec => {
      describe(`for spec ${currentSpec.specName}`, () => {
        it('should generate a default value from jsdoc', () => {
          const definition = getValidatedDefinition('TestModel', currentSpec);
          if (!definition.properties) {
            throw new Error('No definition properties.');
          }

          expect(definition.properties.boolValue.default).to.equal('true');
        });
      });
    });
  });

  describe('Class-based generation', () => {
    allSpecs.forEach(currentSpec => {
      const modelName = 'TestClassModel';
      const definition = getValidatedDefinition(modelName, currentSpec);
      if (!definition.properties) {
        throw new Error('Definition has no properties.');
      }

      const properties = definition.properties;

      it('should generate a definition for referenced model', () => {
        getValidatedDefinition(modelName, currentSpec);
      });

      it('should generate a required property from a required property', () => {
        const propertyName = 'publicStringProperty';
        if (!properties[propertyName]) {
          throw new Error(`Property '${propertyName}' was expected to exist.`);
        }

        expect(definition.required).to.contain(propertyName);
      });

      it('should generate an optional property from an optional property', () => {
        const propertyName = 'optionalPublicStringProperty';
        if (!properties[propertyName]) {
          throw new Error(`Property '${propertyName}' was expected to exist.`);
        }
      });

      it('should generate a required property from a required property with no access modifier', () => {
        const propertyName = 'stringProperty';
        if (!properties[propertyName]) {
          throw new Error(`Property '${propertyName}' was expected to exist.`);
        }

        expect(definition.required).to.contain(propertyName);
      });

      it('should generate a required property from a required constructor var', () => {
        const propertyName = 'publicConstructorVar';
        if (!properties[propertyName]) {
          throw new Error(`Property '${propertyName}' was expected to exist.`);
        }

        expect(definition.required).to.contain(propertyName);
      });

      it('should generate an optional property from an optional constructor var', () => {
        const propertyName = 'optionalPublicConstructorVar';
        if (!properties[propertyName]) {
          throw new Error(`Property '${propertyName}' was expected to exist.`);
        }

        expect(definition.required).to.not.contain(propertyName);
      });

      it('should not generate a property for a non-public property', () => {
        const propertyName = 'protectedStringProperty';
        if (properties[propertyName]) {
          throw new Error(`Property '${propertyName}' was not expected to exist.`);
        }
      });

      it('should not generate a property for a static property', () => {
        const propertyName = 'staticStringProperty';
        if (properties[propertyName]) {
          throw new Error(`Property '${propertyName}' was not expected to exist.`);
        }
      });

      it('should not generate a property for a non-public constructor var', () => {
        const propertyName = 'protectedConstructorVar';
        if (properties[propertyName]) {
          throw new Error(`Property '${propertyName}' was not expected to exist.`);
        }
      });

      it('should generate a property from a readonly constructor argument', () => {
        const propertyName = 'readonlyConstructorArgument';
        if (!properties[propertyName]) {
          throw new Error(`Property '${propertyName}' was expected to exist.`);
        }

        expect(definition.required).to.contain(propertyName);
      });

      it('should generate properties from a base class', () => {
        const property = properties.id;
        expect(property).to.exist;
      });

      it('should generate a definition description from a model jsdoc comment', () => {
        expect(definition.description).to.equal('This is a description of TestClassModel');
      });

      it('should generate a property format from a property jsdoc comment', () => {
        const propertyName = 'emailPattern';

        const property = properties[propertyName];
        if (!property) {
          throw new Error(`There was no '${propertyName}' property.`);
        }

        expect(property.format).to.equal('email');
      });

      it('should generate a property description from a property jsdoc comment', () => {
        const propertyName = 'publicStringProperty';

        const property = properties[propertyName];
        if (!property) {
          throw new Error(`There was no '${propertyName}' property.`);
        }

        expect(property).to.exist;
        expect(property.description).to.equal('This is a description of a public string property');
      });

      it('should generate a property description from a constructor var jsdoc comment', () => {
        const propertyName = 'publicConstructorVar';

        const property = properties[propertyName];
        if (!property) {
          throw new Error(`There was no '${propertyName}' property.`);
        }

        expect(property).to.exist;
        expect(property.description).to.equal('This is a description for publicConstructorVar');
      });

      it('should generate a property minLength', () => {
        const propertyName = 'publicStringProperty';

        const property = properties[propertyName];
        if (!property) {
          throw new Error(`There was no '${propertyName}' property.`);
        }

        expect(property).to.exist;
        expect(property.minLength).to.equal(3);
      });

      it('should generate a property maxLength', () => {
        const propertyName = 'publicStringProperty';

        const property = properties[propertyName];
        if (!property) {
          throw new Error(`There was no '${propertyName}' property.`);
        }

        expect(property).to.exist;
        expect(property.maxLength).to.equal(20);
      });

      it('should generate a property pattern', () => {
        const propertyName = 'publicStringProperty';

        const property = properties[propertyName];
        if (!property) {
          throw new Error(`There was no '${propertyName}' property.`);
        }

        expect(property).to.exist;
        expect(property.pattern).to.equal('^[a-zA-Z]+$');
      });
    });
  });

  describe('Generic-based generation', () => {
    allSpecs.forEach(currentSpec => {
      const modelName = 'TestClassModel';
      const definition = getValidatedDefinition(modelName, currentSpec);
      if (!definition.properties) {
        throw new Error('Definition has no properties.');
      }

      const properties = definition.properties;

      describe(`for ${currentSpec}`, () => {
        it('should not generate a property for a non-public constructor var', () => {
          const propertyNames = ['defaultConstructorArgument', 'deprecatedNonPublicConstructorVar'];
          propertyNames.forEach(propertyName => {
            if (properties[propertyName]) {
              throw new Error(`Property '${propertyName}' was not expected to exist.`);
            }
          });
        });

        it('should generate properties from a base class', () => {
          const property = properties.id;
          expect(property).to.exist;
        });

        it('should generate different definitions for a generic model', () => {
          const genericDefinition = getValidatedDefinition('GenericModel_TestModel_', currentSpec).properties;

          if (!genericDefinition) {
            throw new Error(`There were no properties on model.`);
          }

          const property = genericDefinition.result;

          expect(property).not.to.haveOwnProperty('additionalProperties', 'since swagger does not support setting that property on $refs');

          expect(property).to.exist;
          expect(property.$ref).to.equal('#/definitions/TestModel');
        });
        it('should generate different definitions for a generic model array', () => {
          const definition = getValidatedDefinition('GenericModel_TestModel-Array_', currentSpec).properties;

          if (!definition) {
            throw new Error(`There were no properties on model.`);
          }

          const property = definition.result;

          expect(property).to.exist;
          expect(property.type).to.equal('array');

          expect(property).not.to.haveOwnProperty(
            'additionalProperties',
            'since JSON does not support properties on Arrays. JS does, but since tsoa validates JSON that come accross the wire, we do not need validate an impossible condition',
          );

          if (!property.items) {
            throw new Error(`There were no items on the property model.`);
          }
          expect((property.items as Swagger.Schema).$ref).to.equal('#/definitions/TestModel');
        });
        it('should generate different definitions for a generic primitive', () => {
          const definition = getValidatedDefinition('GenericModel_string_', currentSpec).properties;

          if (!definition) {
            throw new Error(`There were no properties on model.`);
          }

          const property = definition.result;

          expect(property).not.to.haveOwnProperty('additionalProperties', 'since primitives in JSON can not have additional properties, it would be an impossible case');

          expect(property).to.exist;
          expect(property.type).to.equal('string');
        });
        it('should generate different definitions for a generic primitive array', () => {
          const definition = getValidatedDefinition('GenericModel_string-Array_', currentSpec).properties;

          if (!definition) {
            throw new Error(`There were no properties on model.`);
          }

          const property = definition.result;

          expect(property).to.exist;
          expect(property.type).to.equal('array');

          expect(property).not.to.haveOwnProperty(
            'additionalProperties',
            'since JSON does not support properties on Arrays. JS does, but since tsoa validates JSON that come accross the wire, we do not need validate an impossible condition',
          );

          if (!property.items) {
            throw new Error(`There were no items on the property model.`);
          }
          expect((property.items as Swagger.Schema).type).to.equal('string');
        });
        it('should propagate generics', () => {
          const definition = getValidatedDefinition('GenericModel_TestModel-Array_', currentSpec).properties;

          expect(definition!.result).to.deep.equal({ items: { $ref: '#/definitions/TestModel' }, type: 'array', description: undefined, format: undefined, example: undefined, default: undefined });
          expect(definition!.union).to.deep.equal({ type: 'object', description: undefined, format: undefined, default: undefined, example: undefined });
          expect(definition!.nested).to.deep.equal({ $ref: '#/definitions/GenericRequest_TestModel-Array_', description: undefined, format: undefined, example: undefined });

          const ref = getValidatedDefinition('GenericRequest_TestModel-Array_', currentSpec).properties;
          expect(ref!.name).to.deep.equal({ type: 'string', description: undefined, format: undefined, default: undefined, example: undefined });
          expect(ref!.value).to.deep.equal({ items: { $ref: '#/definitions/TestModel' }, type: 'array', description: undefined, format: undefined, default: undefined, example: undefined });
        });
        it('should not propagate dangling context', () => {
          const definition = getValidatedDefinition('DanglingContext_number_', currentSpec).properties;

          expect(definition!.number).to.deep.equal({ type: 'number', format: 'double', description: undefined, default: undefined, example: undefined });
          expect(definition!.shouldBeString!.$ref).to.deep.equal('#/definitions/TSameNameDifferentValue');
        });
        it('should check heritage clauses for type args', () => {
          const definition = getValidatedDefinition('GenericModel_TestModel-Array_', currentSpec).properties;

          expect(definition!.heritageCheck).to.deep.equal({
            $ref: '#/definitions/ThingContainerWithTitle_TestModel-Array_',
            description: undefined,
            format: undefined,
            example: undefined,
          });

          const ref = getValidatedDefinition('ThingContainerWithTitle_TestModel-Array_', currentSpec).properties;
          expect(ref!.title).to.deep.equal({ type: 'string', description: undefined, format: undefined, default: undefined, example: undefined });
          expect(ref!.t).to.deep.equal({
            default: undefined,
            description: undefined,
            example: undefined,
            format: undefined,
            items: {
              $ref: '#/definitions/TestModel',
            },
            type: 'array',
          });

          expect(ref!.id).to.deep.equal({ type: 'string', description: undefined, format: undefined, default: undefined, example: undefined });
          expect(ref!.list).to.deep.equal({
            items: { type: 'number', format: 'double' },
            type: 'array',
            description: undefined,
            format: undefined,
            default: undefined,
            example: undefined,
          });
        });
      });
    });
  });

  describe('methods', () => {
    describe('deprecation', () => {
      it('marks deprecated methods as deprecated', () => {
        const metadata = new MetadataGenerator('./fixtures/controllers/deprecatedController.ts').Generate();
        const deprecatedSpec = new SpecGenerator2(metadata, defaultOptions).GetSpec();

        expect(deprecatedSpec.paths['/Controller/deprecatedGetMethod']?.get?.deprecated).to.eql(true);
        expect(deprecatedSpec.paths['/Controller/deprecatedGetMethod2']?.get?.deprecated).to.eql(true);
      });

      it('mark deprecated parameters as x-deprecated', () => {
        const metadata = new MetadataGenerator('./fixtures/controllers/parameterController.ts').Generate();
        const deprecatedSpec = new SpecGenerator2(metadata, defaultOptions).GetSpec();

        const parameters = deprecatedSpec.paths['/ParameterTest/ParameterDeprecated']?.post?.parameters ?? [];
        expect(parameters.map(param => ((param as unknown) as Record<string, unknown>)['x-deprecated'])).to.eql([undefined, true, true]);
      });
    });
  });
});
