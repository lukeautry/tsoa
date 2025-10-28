import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';
import { VerifyPathableParameter } from '../../utilities/verifyParameter';
import { VerifyPath } from '../../utilities/verifyPath';
import { Swagger } from '@tsoa/runtime';

describe('DELETE route generation', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/deleteController.ts').Generate();
  const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();
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
    return VerifyPath(spec, route, path => path.delete, isCollection, isNoContent);
  }

  function getVerifiedParameters(actionRoute: string): Swagger.Parameter2[] {
    const path = verifyPath(actionRoute, false, true);
    if (!path.delete) {
      throw new Error('No delete operation.');
    }
    if (!path.delete.parameters) {
      throw new Error('No operation parameters.');
    }

    return path.delete.parameters;
  }
});
