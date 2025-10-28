import * as chai from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';
import { VerifyBodyParameter, VerifyPathableParameter } from '../../utilities/verifyParameter';
import { defaultModelName, VerifyPath } from '../../utilities/verifyPath';
import { Swagger } from '@tsoa/runtime';

describe('POST route generation', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/postController.ts').Generate();
  const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();
  const baseRoute = '/PostTest';

  const getValidatedParameters = (actionRoute: string): Swagger.Parameter2[] => {
    const path = verifyPath(actionRoute);
    if (!path.post) {
      throw new Error('No patch operation.');
    }
    if (!path.post.parameters) {
      throw new Error('No parameters');
    }

    return path.post.parameters;
  };

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
    const parameters = getValidatedParameters(actionRoute);
    VerifyPathableParameter(parameters, 'id', 'number', 'path', 'double');
  });

  it('should generate a parameter for body parameters', () => {
    const parameters = getValidatedParameters(baseRoute);
    VerifyBodyParameter(parameters, 'model', defaultModelName, 'body');
  });

  it('should reject multiple body parameters', () => {
    chai
      .expect(() => {
        const invalidMetadata = new MetadataGenerator('./fixtures/controllers/invalidPostController.ts').Generate();
        new SpecGenerator2(invalidMetadata, getDefaultExtendedOptions()).GetSpec();
      })
      .to.throw("Only one body parameter allowed in 'InvalidPostTestController.postWithMultipleBodyParams' method.");
  });

  it('should be able to parse body and query parameters together', () => {
    const parameters = getValidatedParameters(`${baseRoute}/WithBodyAndQueryParams`);
    VerifyBodyParameter(parameters, 'model', defaultModelName, 'body');
    VerifyPathableParameter(parameters, 'query', 'string', 'query');
  });

  function verifyPath(route: string, isCollection?: boolean) {
    return VerifyPath(spec, route, path => path.post, isCollection);
  }
});
