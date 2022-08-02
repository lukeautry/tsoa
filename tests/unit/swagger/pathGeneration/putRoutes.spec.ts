import 'mocha';
import { MetadataGenerator } from '@namecheap/tsoa-cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@namecheap/tsoa-cli/swagger/specGenerator2';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';
import { VerifyBodyParameter, VerifyPathableParameter } from '../../utilities/verifyParameter';
import { defaultModelName, VerifyPath } from '../../utilities/verifyPath';

describe('PUT route generation', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/putController.ts').Generate();
  const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();
  const baseRoute = '/PutTest';

  const getValidatedParameters = (actionRoute: string) => {
    const path = verifyPath(actionRoute);
    if (!path.put) {
      throw new Error('No patch operation.');
    }
    if (!path.put.parameters) {
      throw new Error('No parameters');
    }

    return path.put.parameters as any;
  };

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
    const parameters = getValidatedParameters(`${baseRoute}/WithId/{id}`);
    VerifyPathableParameter(parameters, 'id', 'number', 'path', 'double');
  });

  it('should generate a parameter for body parameters', () => {
    const parameters = getValidatedParameters(baseRoute);
    VerifyBodyParameter(parameters, 'model', defaultModelName, 'body');
  });

  function verifyPath(route: string, isCollection?: boolean) {
    return VerifyPath(spec, route, path => path.put, isCollection);
  }
});
