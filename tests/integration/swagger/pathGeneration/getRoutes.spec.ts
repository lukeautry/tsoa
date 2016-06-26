import {SwaggerGenerator} from '../../../../src/swagger/generator';
import {VerifyPath} from '../../utilities/verifyPath';
import {VerifyPathableParameter} from '../../utilities/verifyParameter';
import * as chai from 'chai';

describe('GET route generation', () => {
    const spec = SwaggerGenerator.GetSpec('./tests/integration/fixtures/getController.ts');
    const baseRoute = '/GetTest';

    it('should generate a path for a GET route with no path argument', () => {
        verifyPath(baseRoute);
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

    it('should reject complex types as arguments', () => {
        chai.expect(() => {
            SwaggerGenerator.GetSpec('./tests/integration/fixtures/invalidGetController.ts');
        }).to.throw('Not a type that can be used as a path or query parameter.');
    });

    it('should generate a path description from jsdoc comment', () => {
        const path = verifyPath(baseRoute);
        chai.expect(path.get.description).to.equal('This is a description of the getModel method\nthis is some more text on another line');
    });

    function verifyPath(route: string, isCollection?: boolean) {
        return VerifyPath(spec, route, path => path.get, isCollection);
    }
});
