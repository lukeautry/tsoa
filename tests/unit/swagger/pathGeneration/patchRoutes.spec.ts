import 'mocha';
import {getDefaultOptions} from '../../../fixtures/defaultOptions';
import {MetadataGenerator} from '../../../../src/metadataGeneration/metadataGenerator';
import {SpecGenerator} from '../../../../src/swagger/specGenerator';
import {VerifyBodyParameter, VerifyPathableParameter} from '../../utilities/verifyParameter';
import {VerifyPath, modelName} from '../../utilities/verifyPath';

describe('PATCH route generation', () => {
    const metadata = new MetadataGenerator('./tests/fixtures/controllers/patchController.ts').Generate();
    const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();
    const baseRoute = '/PatchTest';

    it('should generate a path for a PATCH route with no path argument', () => {
        verifyPath(baseRoute);
    });

    it('should generate a path for a PATCH route with a path argument', () => {
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
        VerifyPathableParameter(path.patch.parameters as any, 'id', 'integer', 'path');
    });

    it('should generate a parameter for body parameters', () => {
        const path = verifyPath(baseRoute);
        VerifyBodyParameter(path.patch.parameters as any, 'model', modelName, 'body');
    });

    function verifyPath(route: string, isCollection?: boolean) {
        return VerifyPath(spec, route, path => path.patch, isCollection);
    }
});
