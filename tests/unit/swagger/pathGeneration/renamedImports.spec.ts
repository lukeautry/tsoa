import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { getDefaultExtendedOptions } from 'fixtures/defaultOptions';
import { VerifyPath } from 'unit/utilities/verifyPath';

describe('Renamed imports', () => {
  describe('method', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/controllerWithRenamedMethodImport.ts').Generate();
    const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();
    const baseRoute = '/RenamedMethodImport';

    it('should generate a path for a function with a renamed method decorator', () => {
      verifyPath(baseRoute);
    });

    function verifyPath(route: string, isCollection?: boolean, isNoContent?: boolean) {
      return VerifyPath(spec, route, path => path.get, isCollection, isNoContent);
    }
  });

  describe('model', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/controllerWithRenamedModelImport.ts').Generate();
    const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();
    const baseRoute = '/RenamedModelImport';

    it('should generate a path for a function with a renamed model', () => {
      verifyPath(baseRoute);
    });

    function verifyPath(route: string, isCollection?: boolean, isNoContent?: boolean) {
      return VerifyPath(spec, route, path => path.get, isCollection, isNoContent);
    }
  });
});
