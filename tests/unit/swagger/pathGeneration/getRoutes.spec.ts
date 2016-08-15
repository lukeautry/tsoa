import 'mocha';
import {getDefaultOptions} from '../../../fixtures/defaultOptions';
import {MetadataGenerator} from '../../../../src/metadataGeneration/metadataGenerator';
import {SpecGenerator} from '../../../../src/swagger/specGenerator';
import {VerifyPath} from '../../utilities/verifyPath';
import {VerifyPathableParameter} from '../../utilities/verifyParameter';
import * as chai from 'chai';

const expect = chai.expect;

describe('GET route generation', () => {
    const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();
    const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();
    const baseRoute = '/GetTest';

    it('should generate a path for a GET route with no path argument', () => {
        verifyPath(baseRoute);
    });

    it('should generate a path for a GET route with no controller path argument', () => {
        const pathlessMetadata = new MetadataGenerator('./tests/fixtures/controllers/pathlessGetController.ts').Generate();
        const pathlessSpec = new SpecGenerator(pathlessMetadata, getDefaultOptions()).GetSpec();
        VerifyPath(pathlessSpec, '/Current', path => path.get, false);
    });

    it('should generate a path for a GET route with a path argument', () => {
        const actionRoute = `${baseRoute}/Current`;
        verifyPath(actionRoute);
    });

    it('should generate a parameter for path parameters', () => {
        const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
        const path = verifyPath(actionRoute);

        VerifyPathableParameter(path.get.parameters as any, 'booleanPathParam', 'boolean', 'path');
        VerifyPathableParameter(path.get.parameters as any, 'numberPathParam', 'integer', 'path');
        VerifyPathableParameter(path.get.parameters as any, 'stringPathParam', 'string', 'path');
    });

    it('should generate a parameter for query parameters', () => {
        const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
        const path = verifyPath(actionRoute);

        VerifyPathableParameter(path.get.parameters as any, 'booleanParam', 'boolean', 'query');
        VerifyPathableParameter(path.get.parameters as any, 'numberParam', 'integer', 'query');
        VerifyPathableParameter(path.get.parameters as any, 'stringParam', 'string', 'query');
    });

    it('should set a valid response type for collection responses', () => {
        const actionRoute = `${baseRoute}/Multi`;
        verifyPath(actionRoute, true);
    });

    it('should set a valid response type for union type return type', () => {
        const actionRoute = `${baseRoute}/UnionTypeResponse`;
        expect(spec.paths[actionRoute].get.responses['200'].schema.type).to.equal('object');
    });

    it('should reject complex types as arguments', () => {
        expect(() => {
            const invalidMetadata = new MetadataGenerator('./tests/fixtures/controllers/invalidGetController.ts').Generate();
            new SpecGenerator(invalidMetadata, getDefaultOptions()).GetSpec();
        }).to.throw('Parameter \'myModel\' can\'t be passed as a query parameter.');
    });

    it('should generate a path description from jsdoc comment', () => {
        const path = verifyPath(baseRoute);
        expect(path.get.description).to.equal('This is a description of the getModel method\nthis is some more text on another line');
    });

    it('should generate optional parameters from default value', () => {
        const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
        const path = verifyPath(actionRoute);

        const parameter = path.get.parameters.filter(p => p.name === 'optionalStringParam')[0];
        expect(parameter).to.exist;
        expect(parameter.required).to.be.false;
    });

    it('should generate parameter description from jsdoc comment on path parameter', () => {
        verifyParameterDescription('numberPathParam');
    });

    it('should generate parameter description from jsdoc comment on query parameter', () => {
        verifyParameterDescription('numberParam');
    });

    it('should generate example from example decorator', () => {
        const path = verifyPath(baseRoute);
        const examples = path.get.responses['200'].examples['application/json'] as any;
        expect(examples.id).to.equal(1);
        expect(examples.boolArray).to.deep.equal([true, false]);
        expect(examples.boolValue).to.equal(true);
        expect(examples.modelValue.email).to.equal('test@test.com');
        expect(examples.modelValue.id).to.equal(100);
        expect(examples.modelsArray).to.be.undefined;
        expect(examples.numberArray).to.deep.equal([1, 2, 3]);
        expect(examples.numberValue).to.equal(1);
        expect(examples.optionalString).to.equal('optional string');
        expect(examples.stringArray).to.deep.equal(['string one', 'string two']);
        expect(examples.stringValue).to.equal('a string');
    });

    function verifyParameterDescription(parameterName: string) {
        const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
        const path = verifyPath(actionRoute);

        const parameter = path.get.parameters.filter(p => p.name === parameterName)[0];
        expect(parameter).to.exist;
        expect(parameter.description).to.equal(`This is a description for ${parameterName}`);
    }

    function verifyPath(route: string, isCollection?: boolean) {
        return VerifyPath(spec, route, path => path.get, isCollection);
    }
});
