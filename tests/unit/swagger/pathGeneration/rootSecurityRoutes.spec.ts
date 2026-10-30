import { withCompiler } from '@tsoa/cli/compiler';
import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';
import { VerifyPath } from '../../utilities/verifyPath';
import type { Swagger } from '@tsoa/runtime';

describe('Security route generation with root security', () => {
  describe('with @Security() on controller', () => {
    before(() =>
      withCompiler(() => {
        noSecurityControllerMetadata = new MetadataGenerator('./fixtures/controllers/noSecurityController.ts', undefined, undefined, undefined, [
          {
            root_level_auth: [],
          },
        ]).Generate();
        noSecuritySpec = new SpecGenerator2(noSecurityControllerMetadata, getDefaultExtendedOptions()).GetSpec();
      }),
    );

    let noSecurityControllerMetadata: ReturnType<MetadataGenerator['Generate']>;
    let noSecuritySpec: ReturnType<SpecGenerator2['GetSpec']>;

    it('should use the method level security over root/controller security', () => {
      const path = verifyPath(noSecuritySpec, '/NoSecurityTest');

      if (!path.get) {
        throw new Error('No get operation.');
      }

      expect(path.get.security).to.deep.equal([{ api_key: [] }]);
    });

    it('should generate a route with no security if method has @NoSecurity()', () => {
      const path = verifyPath(noSecuritySpec, '/NoSecurityTest/Anonymous');

      if (!path.get) {
        throw new Error('No get operation.');
      }

      expect(path.get.security).to.deep.equal([]);
    });

    it('should use controller level security if nothing specified on method', () => {
      const path = verifyPath(noSecuritySpec, '/NoSecurityTest/Oauth');

      if (!path.get) {
        throw new Error('No get operation.');
      }

      expect(path.get.security).to.deep.equal([{ tsoa_auth: ['write:pets', 'read:pets'] }]);
    });
  });

  describe('with undefined controller level security', () => {
    before(() =>
      withCompiler(() => {
        plainControllerMetadata = new MetadataGenerator('./fixtures/controllers/pathlessGetController.ts', undefined, undefined, undefined, [
          {
            root_level_auth: [],
          },
        ]).Generate();
        plainSpec = new SpecGenerator2(plainControllerMetadata, getDefaultExtendedOptions()).GetSpec();
      }),
    );

    let plainControllerMetadata: ReturnType<MetadataGenerator['Generate']>;
    let plainSpec: ReturnType<SpecGenerator2['GetSpec']>;

    it('should use root level security if no security defined on method', () => {
      const path = verifyPath(plainSpec, '/Current', 'TestModel');

      if (!path.get) {
        throw new Error('No get operation.');
      }

      expect(path.get.security).to.deep.equal([
        {
          root_level_auth: [],
        },
      ]);
    });
  });

  describe('with @NoSecurity() on controller', () => {
    before(() =>
      withCompiler(() => {
        noSecurityControllerMetadata = new MetadataGenerator('./fixtures/controllers/noSecurityOnController.ts', undefined, undefined, undefined, [
          {
            root_level_auth: [],
          },
        ]).Generate();
        noSecurityOnControllerSpec = new SpecGenerator2(noSecurityControllerMetadata, getDefaultExtendedOptions()).GetSpec();
      }),
    );

    let noSecurityControllerMetadata: ReturnType<MetadataGenerator['Generate']>;
    let noSecurityOnControllerSpec: ReturnType<SpecGenerator2['GetSpec']>;

    it('should use the method level security over root/controller security', () => {
      const path = verifyPath(noSecurityOnControllerSpec, '/NoSecurity');

      if (!path.get) {
        throw new Error('No get operation.');
      }

      expect(path.get.security).to.deep.equal([{ api_key: [] }]);
    });

    it('should have no security if method has nothing specified', () => {
      const path = verifyPath(noSecurityOnControllerSpec, '/NoSecurity/UndefinedSecurity');

      if (!path.get) {
        throw new Error('No get operation.');
      }

      expect(path.get.security).to.deep.equal([]);
    });

    it('should have no security if method has @NoSecurity()', () => {
      const path = verifyPath(noSecurityOnControllerSpec, '/NoSecurity/NoSecurity');

      if (!path.get) {
        throw new Error('No get operation.');
      }

      expect(path.get.security).to.deep.equal([]);
    });
  });

  function verifyPath(spec: Swagger.Spec2, route: string, model = 'UserResponseModel') {
    return VerifyPath(spec, route, path => path.get, undefined, false, `#/definitions/${model}`);
  }
});
