import 'mocha';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator } from '../../../../src/swagger/specGenerator';
import { getDefaultOptions } from '../../../fixtures/defaultOptions';
import { VerifyPathableParameter } from '../../utilities/verifyParameter';
import { VerifyPath } from '../../utilities/verifyPath';

describe('HEAD route generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/headController.ts').Generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();
  const baseRoute = '/HeadTest';

  it('should generate a path for a HEAD route with no path argument', () => {
    verifyPath(baseRoute, false, true);
  });

  it('should generate a path for a HEAD route with a path argument', () => {
    const actionRoute = `${baseRoute}/Current`;
    verifyPath(actionRoute, false, true);
  });

  it('should generate a parameter for path parameters', () => {
    const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
    const parameters = getVerifiedParameters(actionRoute);

    VerifyPathableParameter(parameters, 'booleanPathParam', 'boolean', 'path');
    VerifyPathableParameter(parameters, 'numberPathParam', 'number', 'path', 'double');
    VerifyPathableParameter(parameters, 'stringPathParam', 'string', 'path');
  });

  it('should generate a parameter for query parameters', () => {
    const actionRoute = `${baseRoute}/{numberPathParam}/{booleanPathParam}/{stringPathParam}`;
    const parameters = getVerifiedParameters(actionRoute);

    VerifyPathableParameter(parameters, 'booleanParam', 'boolean', 'query');
    VerifyPathableParameter(parameters, 'numberParam', 'number', 'query', 'double');
    VerifyPathableParameter(parameters, 'stringParam', 'string', 'query');
  });

  function verifyPath(route: string, isCollection?: boolean, isNoContent?: boolean) {
    return VerifyPath(spec, route, path => path.head, isCollection, isNoContent);
  }

  function getVerifiedParameters(actionRoute: string) {
    const path = verifyPath(actionRoute, false, true);
    if (!path.head) { throw new Error('No head operation.'); }
    if (!path.head.parameters) { throw new Error('No operation parameters.'); }

    return path.head.parameters as any;
  }
});
