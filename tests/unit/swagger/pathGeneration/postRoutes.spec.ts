import * as chai from 'chai';
import 'mocha';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator } from '../../../../src/swagger/specGenerator';
import { getDefaultOptions } from '../../../fixtures/defaultOptions';
import { VerifyBodyParameter, VerifyPathableParameter } from '../../utilities/verifyParameter';
import { defaultModelName, VerifyPath } from '../../utilities/verifyPath';

describe('POST route generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/postController.ts').Generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();
  const baseRoute = '/PostTest';

  const getValidatedParameters = (actionRoute: string) => {
    const path = verifyPath(actionRoute);
    if (!path.post) { throw new Error('No patch operation.'); }
    if (!path.post.parameters) { throw new Error('No parameters'); }

    return path.post.parameters as any;
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
    chai.expect(() => {
      const invalidMetadata = new MetadataGenerator('./tests/fixtures/controllers/invalidPostController.ts').Generate();
      new SpecGenerator(invalidMetadata, getDefaultOptions()).GetSpec();
    }).to.throw('Only one body parameter allowed in \'InvalidPostTestController.postWithMultipleBodyParams\' method.');
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
