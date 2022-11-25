import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { getDefaultExtendedOptions } from 'fixtures/defaultOptions';
import { VerifyPath } from 'unit/utilities/verifyPath';
import { expect } from 'chai';

describe('Renamed imports', () => {
  describe('model', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/controllerWithRenamedModelImport.ts').Generate();
    const spec2 = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();
    const spec3 = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
    const baseRoute = '/RenamedModelImport';

    it('should generate a path for a function with a renamed model', () => {
      verifyPath(baseRoute);

      expect(spec2.definitions?.['TestModelRenamed']).to.deep.equal(spec2?.definitions?.['TestModel']);
    });

    it('should generate a path for a function with a renamed model and a renamed parameter', () => {
      expect(spec3.paths?.[baseRoute]?.get?.responses?.[200]?.content?.['application/json']?.schema).to.deep.equal({
        $ref: '#/components/schemas/TestModelRenamed',
      });

      expect(spec3.components.schemas?.['TestModelRenamed']).to.deep.equal(spec3.components.schemas?.['TestModel']);
    });

    function verifyPath(route: string, isCollection?: boolean, isNoContent?: boolean) {
      return VerifyPath(spec2, route, path => path.get, isCollection, isNoContent, '#/definitions/TestModelRenamed');
    }
  });
});
