import 'mocha';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator } from '../../../../src/swagger/specGenerator';
import { VerifyPath } from '../../utilities/verifyPath';
import { VerifyPathableParameter } from '../../utilities/verifyParameter';
import { getDefaultOptions } from '../../../fixtures/defaultOptions';

describe('DELETE route generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/deleteController.ts').Generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();
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
    const parameters = getVerifiedParameters(actionRoute);

    VerifyPathableParameter(parameters, 'booleanPathParam', 'boolean', 'path');
    VerifyPathableParameter(parameters, 'numberPathParam', 'integer', 'path');
    VerifyPathableParameter(parameters, 'stringPathParam', 'string', 'path');
  });

  it('should generate a parameter for query parameters', () => {
    const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
    const parameters = getVerifiedParameters(actionRoute);

    VerifyPathableParameter(parameters, 'booleanParam', 'boolean', 'query');
    VerifyPathableParameter(parameters, 'numberParam', 'integer', 'query');
    VerifyPathableParameter(parameters, 'stringParam', 'string', 'query');
  });

  function verifyPath(route: string, isCollection?: boolean, isNoContent?: boolean) {
    return VerifyPath(spec, route, path => path.delete, isCollection, isNoContent);
  }

  function getVerifiedParameters(actionRoute: string) {
    const path = verifyPath(actionRoute, false, true);
    if (!path.delete) { throw new Error('No delete operation.'); }
    if (!path.delete.parameters) { throw new Error('No operation parameters.'); }

    return path.delete.parameters as any;
  }
});
