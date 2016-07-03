import {MetadataGenerator} from '../../../../src/metadataGeneration/metadataGenerator';
import {SpecGenerator} from '../../../../src/swagger/specGenerator';
import {VerifyBodyParameter, VerifyPathableParameter} from '../../utilities/verifyParameter';
import {VerifyPath, modelName} from '../../utilities/verifyPath';
import * as chai from 'chai';

describe('POST route generation', () => {
    const metadata = new MetadataGenerator().Generate('./tests/fixtures/controllers/postController.ts');
    const spec = new SpecGenerator(metadata).GetSpec();
    const baseRoute = '/PostTest';

    it('should generate a path for a POST route with no path argument', () => {
        verifyPath(baseRoute);
    });

    it('should generate a path for a POST route with a path argument', () => {
        const actionRoute = `${baseRoute}/Location`;
        verifyPath(actionRoute);
    });

    it('should set a valid response type for collection responses', () => {
        const actionRoute = `${baseRoute}/Multi`;
        verifyPath(actionRoute, true);
    });

    it('should generate a parameter for path parameters', () => {
        const actionRoute = `${baseRoute}/WithId/{id}`;
        const path = verifyPath(actionRoute);
        VerifyPathableParameter(path.post.parameters as any, 'id', 'integer', 'path');
    });

    it('should generate a parameter for body parameters', () => {
        const path = verifyPath(baseRoute);
        VerifyBodyParameter(path.post.parameters as any, 'model', modelName, 'body');
    });

    it('should reject multiple body parameters', () => {
        chai.expect(() => {
            const invalidMetadata = new MetadataGenerator().Generate('./tests/fixtures/controllers/invalidPostController.ts');
            new SpecGenerator(invalidMetadata).GetSpec();
        }).to.throw('Only one body parameter allowed per controller method.');
    });

    it('should be able to parse body and query parameters together', () => {
        const path = verifyPath(`${baseRoute}/WithBodyAndQueryParams`);
        VerifyBodyParameter(path.post.parameters as any, 'model', modelName, 'body');
        VerifyPathableParameter(path.post.parameters as any, 'query', 'string', 'query');
    });

    function verifyPath(route: string, isCollection?: boolean) {
        return VerifyPath(spec, route, path => path.post, isCollection);
    }
});
