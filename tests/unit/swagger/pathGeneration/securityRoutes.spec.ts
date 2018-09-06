import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator } from '../../../../src/swagger/specGenerator';
import { getDefaultOptions } from '../../../fixtures/defaultOptions';
import { VerifyPath } from '../../utilities/verifyPath';

describe('Security route generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/securityController.ts').Generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).GetSpec();

  it('should generate a route with a named security', () => {
    const path = verifyPath('/SecurityTest');

    if (!path.get) { throw new Error('No get operation.'); }

    expect(path.get.security).to.deep.equal([{api_key: []}]);
  });

  it('should generate a route with scoped security', () => {
    const path = verifyPath('/SecurityTest/Oauth');

    if (!path.get) { throw new Error('No get operation.'); }

    expect(path.get.security).to.deep.equal([{tsoa_auth: ['write:pets', 'read:pets']}]);
  });

  it('should generate a route with security A OR security B', () => {
    const path = verifyPath('/SecurityTest/OauthOrAPIkey');

    if (!path.get) { throw new Error('No get operation.'); }

    expect(path.get.security).to.deep.equal([
      { tsoa_auth: [ 'write:pets', 'read:pets' ] },
      { api_key: [] },
    ]);
  });

  it('should generate a route with security A AND security B', () => {
    const path = verifyPath('/SecurityTest/OauthAndAPIkey');

    if (!path.get) { throw new Error('No get operation.'); }

    expect(path.get.security).to.deep.equal([{
      api_key: [],
      tsoa_auth: [ 'write:pets', 'read:pets' ],
    }]);
  });

  function verifyPath(route: string, isCollection?: boolean) {
    return VerifyPath(spec, route, path => path.get, isCollection, false, '#/definitions/UserResponseModel');
  }
});
