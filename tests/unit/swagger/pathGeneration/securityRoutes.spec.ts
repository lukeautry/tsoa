import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';
import { VerifyPath } from '../../utilities/verifyPath';

describe('Security route generation', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/securityController.ts').Generate();
  const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();

  it('should generate a route with a named security', () => {
    const path = verifyPath('/SecurityTest');

    if (!path.get) {
      throw new Error('No get operation.');
    }

    expect(path.get.security).to.deep.equal([{ api_key: [] }]);
  });

  it('should generate a route with scoped security', () => {
    const path = verifyPath('/SecurityTest/Oauth');

    if (!path.get) {
      throw new Error('No get operation.');
    }

    expect(path.get.security).to.deep.equal([{ tsoa_auth: ['write:pets', 'read:pets'] }]);
  });

  it('should generate a route with security A OR security B', () => {
    const path = verifyPath('/SecurityTest/OauthOrApiKey');

    if (!path.get) {
      throw new Error('No get operation.');
    }

    expect(path.get.security).to.deep.equal([{ tsoa_auth: ['write:pets', 'read:pets'] }, { api_key: [] }]);
  });

  it('should generate a route with security A AND security B', () => {
    const path = verifyPath('/SecurityTest/OauthAndApiKey');

    if (!path.get) {
      throw new Error('No get operation.');
    }

    expect(path.get.security).to.deep.equal([
      {
        api_key: [],
        tsoa_auth: ['write:pets', 'read:pets'],
      },
    ]);
  });

  it('should generate a route with optional security (empty entry)', () => {
    const path = verifyPath('/SecurityTest/ApiKeyOrAnonymous');

    if (!path.get) {
      throw new Error('No get operation.');
    }

    expect(path.get.security).to.deep.equal([{ api_key: [] }, {}]);
  });

  it('should generate controller-level optional security', () => {
    const path = verifyPath('/OptionalSecurityTest');

    if (!path.get) {
      throw new Error('No get operation.');
    }

    expect(path.get.security).to.deep.equal([{ api_key: [] }, {}]);
  });

  it('should let a method-level empty entry override controller security', () => {
    const controllerPath = verifyPath('/OverriddenSecurityTest');
    const methodPath = verifyPath('/OverriddenSecurityTest/Anonymous');

    if (!controllerPath.get || !methodPath.get) {
      throw new Error('No get operation.');
    }

    expect(controllerPath.get.security).to.deep.equal([{ api_key: [] }]);
    expect(methodPath.get.security).to.deep.equal([{}]);
  });

  describe('OpenAPI 3', () => {
    const spec3 = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();

    it('should generate a route with optional security (empty entry)', () => {
      expect(spec3.paths['/SecurityTest/ApiKeyOrAnonymous'].get?.security).to.deep.equal([{ api_key: [] }, {}]);
    });

    it('should generate controller-level optional security', () => {
      expect(spec3.paths['/OptionalSecurityTest'].get?.security).to.deep.equal([{ api_key: [] }, {}]);
    });

    it('should let a method-level empty entry override controller security', () => {
      expect(spec3.paths['/OverriddenSecurityTest/Anonymous'].get?.security).to.deep.equal([{}]);
    });
  });

  function verifyPath(route: string, isCollection?: boolean) {
    return VerifyPath(spec, route, path => path.get, isCollection, false, '#/definitions/UserResponseModel');
  }
});
