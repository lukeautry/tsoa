import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';
import { VerifyPathableParameter } from '../../utilities/verifyParameter';
import { VerifyPath } from '../../utilities/verifyPath';

describe('Sub resource route generation', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/subResourceController.ts').Generate();
  const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();
  const baseRoute = '/SubResourceTest/{mainResourceId}';

  const getValidatedParameters = (actionRoute: string) => {
    const path = VerifyPath(spec, actionRoute, path => path.get);
    if (!path.get) {
      throw new Error('No get operation.');
    }
    if (!path.get.parameters) {
      throw new Error('No parameters');
    }

    return path.get.parameters as any;
  };

  it('should generate a path parameter for method without path parameter', () => {
    const parameters = getValidatedParameters(`${baseRoute}/SubResource`);
    VerifyPathableParameter(parameters, 'mainResourceId', 'string', 'path');
  });

  it('should generate two path parameters for method with path parameter', () => {
    const parameters = getValidatedParameters(`${baseRoute}/SubResource/{subResourceId}`);
    VerifyPathableParameter(parameters, 'mainResourceId', 'string', 'path');
    VerifyPathableParameter(parameters, 'subResourceId', 'string', 'path');
  });
});
