/// <reference path="../../../../typings/index.d.ts" />
import {MetadataGenerator} from '../../../../src/metadataGeneration/metadataGenerator';
import {SpecGenerator} from '../../../../src/swagger/specGenerator';
import * as chai from 'chai';

const expect = chai.expect;

describe('Definition generation', () => {
    const metadata = new MetadataGenerator().Generate('./tests/fixtures/controllers/getController.ts');
    const spec = new SpecGenerator(metadata).GetSpec();

    it('should generate a definition for referenced models', () => {
        const expectedModels = ['TestModel', 'TestSubModel'];
        expectedModels.forEach(modelName => {
            expect(spec.definitions[modelName], `${modelName} should have been automatically generated.`).to.exist;
        });
    });

    it('should generate a definition description from a model jsdoc comment', () => {
        const definition = spec.definitions['TestModel'];
        expect(definition.description).to.equal('This is a description of a model');
    });

    it('should generate a property description from a property jsdoc comment', () => {
        const definition = spec.definitions['TestModel'];
        const property = Object.keys(definition.properties)
            .filter(k => k === 'numberValue')
            .map(k => definition.properties[k])[0];

        expect(property).to.exist;
        expect(property.description).to.equal('This is a description of this model property, numberValue');
    });

    it('should generate properties from extended interface', () => {
        const definition = spec.definitions['TestModel'];
        const property = definition.properties['id'];

        expect(property).to.exist;
    });

    it('should generate an optional property from an optional property', () => {
        const definition = spec.definitions['TestModel'];
        expect(definition.required).to.not.contain('optionalString');
    });
});
