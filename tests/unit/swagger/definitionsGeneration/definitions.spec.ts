import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator } from '../../../../src/swagger/specGenerator';
import { Swagger } from '../../../../src/swagger/swagger';
import { getDefaultOptions } from '../../../fixtures/defaultOptions';

describe('Definition generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();

  const getValidatedDefinition = (name: string) => {
    if (!spec.definitions) {
      throw new Error('No definitions were generated.');
    }

    const definition = spec.definitions[name];
    if (!definition) {
      throw new Error(`${name} should have been automatically generated.`);
    }

    return definition;
  };

  describe('Interface-based generation', () => {
    it('should generate a definition for referenced models', () => {
      const expectedModels = ['TestModel', 'TestSubModel', 'Result', 'TestSubModelContainer', 'TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2', 'TestSubModel2', 'TestSubModelNamespace.TestSubModelNS'];
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

    it('should generate a definition description from a model jsdoc comment', () => {
      const definition = getValidatedDefinition('TestModel');
      expect(definition.description).to.equal('This is a description of a model');
    });

    it('should generate a property description from a property jsdoc comment', () => {
      const definition = getValidatedDefinition('TestModel');
      if (!definition.properties) { throw new Error('Definition has no properties.'); }

      const property = definition.properties.numberValue;
      if (!property) { throw new Error('There was no \'numberValue\' property.'); }

      expect(property).to.exist;
      expect(property.description).to.equal('This is a description of this model property, numberValue');
    });

    it('should generate a property format from a property jsdoc comment', () => {
      const definition = getValidatedDefinition('TestModel');
      if (!definition.properties) { throw new Error('Definition has no properties.'); }

      const property = definition.properties.stringValue;
      if (!property) { throw new Error('There was no \'stringValue\' property.'); }

      expect(property.format).to.equal('password');
    });

    it('should generate properties from extended interface', () => {
      const definition = getValidatedDefinition('TestModel');
      if (!definition.properties) { throw new Error('Definition has no properties.'); }

      const property = definition.properties.id;

      expect(property).to.exist;
    });

    it('should generate an optional property from an optional property', () => {
      const definition = getValidatedDefinition('TestModel');
      expect(definition.required).to.not.contain('optionalString');

      if (!definition.properties) {
        throw new Error('No definition properties.');
      }

      expect(definition.properties.optionalString['x-nullable']).to.equal(true);
    });
  });

  describe('Class-based generation', () => {
    const modelName = 'TestClassModel';
    const definition = getValidatedDefinition(modelName);
    if (!definition.properties) { throw new Error('Definition has no properties.'); }

    const properties = definition.properties;

    it('should generate a definition for referenced model', () => {
      getValidatedDefinition(modelName);
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

    it('should not generate a property for a non-public constructor var', () => {
      const propertyName = 'protectedConstructorVar';
      if (properties[propertyName]) {
        throw new Error(`Property '${propertyName}' was not expected to exist.`);
      }
    });

    it('should generate properties from a base class', () => {
      const property = properties.id;
      expect(property).to.exist;
    });

    it('should generate a definition description from a model jsdoc comment', () => {
      expect(definition.description).to.equal('This is a description of TestClassModel');
    });

    it("should generate a property format from a property jsdoc comment", () => {
      const propertyName = 'emailPattern';

      const property = properties[propertyName];
      if (!property) { throw new Error(`There was no '${propertyName}' property.`); }

      expect(property.format).to.equal('email');
    });

    it('should generate a property description from a property jsdoc comment', () => {
      const propertyName = 'publicStringProperty';

      const property = properties[propertyName];
      if (!property) { throw new Error(`There was no '${propertyName}' property.`); }

      expect(property).to.exist;
      expect(property.description).to.equal('This is a description of a public string property');
    });

    it('should generate a property description from a constructor var jsdoc comment', () => {
      const propertyName = 'publicConstructorVar';

      const property = properties[propertyName];
      if (!property) { throw new Error(`There was no '${propertyName}' property.`); }

      expect(property).to.exist;
      expect(property.description).to.equal('This is a description for publicConstructorVar');
    });

    it('should generate a property minLength', () => {
      const propertyName = 'publicStringProperty';

      const property = properties[propertyName];
      if (!property) { throw new Error(`There was no '${propertyName}' property.`); }

      expect(property).to.exist;
      expect(property.minLength).to.equal(3);
    });

    it('should generate a property maxLength', () => {
      const propertyName = 'publicStringProperty';

      const property = properties[propertyName];
      if (!property) { throw new Error(`There was no '${propertyName}' property.`); }

      expect(property).to.exist;
      expect(property.maxLength).to.equal(20);
    });

    it('should generate a property pattern', () => {
      const propertyName = 'publicStringProperty';

      const property = properties[propertyName];
      if (!property) { throw new Error(`There was no '${propertyName}' property.`); }

      expect(property).to.exist;
      expect(property.pattern).to.equal('^[a-zA-Z]+$');
    });
  });

  describe('Generic-based generation', () => {
    it('should generate different definitions for a generic model', () => {
      const definition = getValidatedDefinition('GenericModelTestModel').properties;

      if (!definition) { throw new Error(`There were no properties on model.`); }

      const property = definition.result;

      expect(property).to.exist;
      expect(property.$ref).to.equal('#/definitions/TestModel');
    });
    it('should generate different definitions for a generic model array', () => {
      const definition = getValidatedDefinition('GenericModelTestModel[]').properties;

      if (!definition) { throw new Error(`There were no properties on model.`); }

      const property = definition.result;

      expect(property).to.exist;
      expect(property.type).to.equal('array');

      if (!property.items) { throw new Error(`There were no items on the property model.`); }
      expect((property.items as Swagger.Schema).$ref).to.equal('#/definitions/TestModel');
    });
    it('should generate different definitions for a generic primitive', () => {
      const definition = getValidatedDefinition('GenericModelstring').properties;

      if (!definition) { throw new Error(`There were no properties on model.`); }

      const property = definition.result;

      expect(property).to.exist;
      expect(property.type).to.equal('string');
    });
    it('should generate different definitions for a generic primitive array', () => {
      const definition = getValidatedDefinition('GenericModelstring[]').properties;

      if (!definition) { throw new Error(`There were no properties on model.`); }

      const property = definition.result;

      expect(property).to.exist;
      expect(property.type).to.equal('array');

      if (!property.items) { throw new Error(`There were no items on the property model.`); }
      expect((property.items as Swagger.Schema).type).to.equal('string');
    });
  });
});
