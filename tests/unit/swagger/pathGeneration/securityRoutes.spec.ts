import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@namecheap/tsoa-cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@namecheap/tsoa-cli/swagger/specGenerator2';
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

  function verifyPath(route: string, isCollection?: boolean) {
    return VerifyPath(spec, route, path => path.get, isCollection, false, '#/definitions/UserResponseModel');
  }
});
