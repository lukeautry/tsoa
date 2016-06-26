/// <reference path="../../../../typings/index.d.ts" />
import {Generator} from '../../../../src/swagger/generator';
import {VerifyPath, modelName} from '../../utilities/verifyPath';
import {VerifyBodyParameter, VerifyPathableParameter} from '../../utilities/verifyParameter';
import * as chai from 'chai';

describe('POST route generation', () => {
    const spec = new Generator().GetSpec('./tests/integration/fixtures/postController.ts');
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
            new Generator().GetSpec('./tests/integration/fixtures/invalidPostController.ts');
        }).to.throw('Only one body parameter allowed per controller method.');
    });

    function verifyPath(route: string, isCollection?: boolean) {
        return VerifyPath(spec, route, path => path.post, isCollection);
    }
});
