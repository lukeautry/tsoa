import {MetadataGenerator} from '../../../../src/metadataGeneration/metadataGenerator';
import {SpecGenerator} from '../../../../src/swagger/specGenerator';
import {VerifyPath, modelName} from '../../utilities/verifyPath';
import {VerifyBodyParameter, VerifyPathableParameter} from '../../utilities/verifyParameter';

describe('PUT route generation', () => {
    const metadata = new MetadataGenerator('./tests/fixtures/controllers/putController.ts').Generate();
    const spec = new SpecGenerator(metadata).GetSpec();
    const baseRoute = '/PutTest';

    it('should generate a path for a PUT route with no path argument', () => {
        verifyPath(baseRoute);
    });

    it('should generate a path for a PUT route with a path argument', () => {
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
        VerifyPathableParameter(path.put.parameters as any, 'id', 'integer', 'path');
    });

    it('should generate a parameter for body parameters', () => {
        const path = verifyPath(baseRoute);
        VerifyBodyParameter(path.put.parameters as any, 'model', modelName, 'body');
    });

    function verifyPath(route: string, isCollection?: boolean) {
        return VerifyPath(spec, route, path => path.put, isCollection);
    }
});
