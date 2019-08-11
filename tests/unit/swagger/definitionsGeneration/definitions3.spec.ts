import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '../../../../src/swagger/specGenerator3';
import { getDefaultOptions } from '../../../fixtures/defaultOptions';

describe('Definition generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();
  const spec = new SpecGenerator3(metadata, getDefaultOptions()).GetSpec();

  const getValidatedDefinition = (name: string) => {
    if (!spec.components.schemas) {
      throw new Error('No schemas were generated.');
    }

    const schemas = spec.components.schemas[name];
    if (!schemas) {
      throw new Error(`${name} should have been automatically generated.`);
    }

    return schemas;
  };

  describe('Interface-based generation', () => {
    it('should generate a definition for referenced models', () => {
      const expectedModels = ['Result', 'UnionTestModel'];
      expectedModels.forEach((modelName) => {
        getValidatedDefinition(modelName);
      });
    });

    it('should generate an member of type object for union type', () => {
      const definition = getValidatedDefinition('Result');
      if (!definition.properties) { throw new Error('Definition has no properties.'); }
      if (!definition.properties.value) { throw new Error('There was no \'value\' property.'); }

      expect(definition.properties.value.type).to.equal('string');
      expect(definition.properties.value.enum).to.deep.equal(['success', 'failure']);
    });

    it('should generate an member of type object for union type', () => {
      const definition = getValidatedDefinition('UnionTestModel');
      if (!definition.properties) { throw new Error('Definition has no properties.'); }
      if (!definition.properties.or) { throw new Error('There was no \'or\' property.'); }

      expect(definition.properties.or).to.deep.include({
        oneOf:
         [
           { '$ref': '#/components/schemas/TypeAliasModel1' },
           { '$ref': '#/components/schemas/TypeAliasModel2' },
        ]
      });
    });

    it('should generate an member of type object for intersection type', () => {
      const definition = getValidatedDefinition('UnionTestModel');
      if (!definition.properties) { throw new Error('Definition has no properties.'); }
      if (!definition.properties.and) { throw new Error('There was no \'and\' property.'); }

      expect(definition.properties.and).to.deep.include({
        allOf:
         [
           { '$ref': '#/components/schemas/TypeAliasModel1' },
           { '$ref': '#/components/schemas/TypeAliasModel2' },
        ]
      });
    });
  });
});

