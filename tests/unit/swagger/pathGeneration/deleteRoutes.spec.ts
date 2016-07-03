import {MetadataGenerator} from '../../../../src/metadataGeneration/metadataGenerator';
import {SpecGenerator} from '../../../../src/swagger/specGenerator';
import {VerifyPath} from '../../utilities/verifyPath';
import {VerifyPathableParameter} from '../../utilities/verifyParameter';

describe('DELETE route generation', () => {
    const metadata = new MetadataGenerator().Generate('./tests/fixtures/controllers/deleteController.ts');
    const spec = new SpecGenerator(metadata).GetSpec();
    const baseRoute = '/DeleteTest';

    it('should generate a path for a DELETE route with no path argument', () => {
        verifyPath(baseRoute);
    });

    it('should generate a path for a DELETE route with a path argument', () => {
        const actionRoute = `${baseRoute}/Current`;
        verifyPath(actionRoute, false, true);
    });

    it('should generate a parameter for path parameters', () => {
        const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
        const path = verifyPath(actionRoute, false, true);

        VerifyPathableParameter(path.delete.parameters as any, 'booleanPathParam', 'boolean', 'path');
        VerifyPathableParameter(path.delete.parameters as any, 'numberPathParam', 'integer', 'path');
        VerifyPathableParameter(path.delete.parameters as any, 'stringPathParam', 'string', 'path');
    });

    it('should generate a parameter for query parameters', () => {
        const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
        const path = verifyPath(actionRoute, false, true);

        VerifyPathableParameter(path.delete.parameters as any, 'booleanParam', 'boolean', 'query');
        VerifyPathableParameter(path.delete.parameters as any, 'numberParam', 'integer', 'query');
        VerifyPathableParameter(path.delete.parameters as any, 'stringParam', 'string', 'query');
    });

    function verifyPath(route: string, isCollection?: boolean, isNoContent?: boolean) {
        return VerifyPath(spec, route, path => path.delete, isCollection, isNoContent);
    }
});
