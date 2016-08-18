import 'mocha';
import {MetadataGenerator} from '../../../../src/metadataGeneration/metadataGenerator';
import {SpecGenerator} from '../../../../src/swagger/specGenerator';
import {getDefaultOptions} from '../../../fixtures/defaultOptions';
import * as chai from 'chai';

const expect = chai.expect;

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

    it('should generate a definition for referenced models', () => {
        const expectedModels = ['TestModel', 'TestSubModel', 'Result'];
        expectedModels.forEach(modelName => {
            getValidatedDefinition(modelName);
        });
    });

    it('should generate an member of type object for union type', () => {
        const definition = getValidatedDefinition('Result');
        if (!definition.properties) { throw new Error('Definition has no properties.'); }
        if (!definition.properties['value']) { throw new Error('There was no \'value\' property.'); }

        expect(definition.properties['value'].type).to.equal('object');
    });

    it('should generate a definition description from a model jsdoc comment', () => {
        const definition = getValidatedDefinition('TestModel');
        expect(definition.description).to.equal('This is a description of a model');
    });

    it('should generate a property description from a property jsdoc comment', () => {
        const definition = getValidatedDefinition('TestModel');
        if (!definition.properties) { throw new Error('Definition has no properties.'); }

        const property = definition.properties['numberValue'];
        if (!property) { throw new Error('There was no \'numberValue\' property.'); }

        expect(property).to.exist;
        expect(property.description).to.equal('This is a description of this model property, numberValue');
    });

    it('should generate properties from extended interface', () => {
        const definition = getValidatedDefinition('TestModel');
        if (!definition.properties) { throw new Error('Definition has no properties.'); }

        const property = definition.properties['id'];

        expect(property).to.exist;
    });

    it('should generate an optional property from an optional property', () => {
        const definition = getValidatedDefinition('TestModel');
        expect(definition.required).to.not.contain('optionalString');
    });
});
