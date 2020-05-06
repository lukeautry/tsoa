import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '../../../../src/swagger/specGenerator2';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';
import { VerifyPath } from '../../utilities/verifyPath';

describe('NoSecurity route generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/noSecurityController.ts').Generate();
  const spec = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();

  it('should generate a route with a named security', () => {
    const path = verifyPath('/NoSecurityTest');

    if (!path.get) {
      throw new Error('No get operation.');
    }

    expect(path.get.security).to.deep.equal([{ api_key: [] }]);
  });

  it('should generate a route with scoped security', () => {
    const path = verifyPath('/NoSecurityTest/Oauth');

    if (!path.get) {
      throw new Error('No get operation.');
    }

    expect(path.get.security).to.deep.equal([{ tsoa_auth: ['write:pets', 'read:pets'] }]);
  });

  it('should generate a route with no security', () => {
    const path = verifyPath('/NoSecurityTest/Anonymous');

    if (!path.get) {
      throw new Error('No get operation.');
    }

    expect(path.get.security).to.deep.equal([]);
  });

  function verifyPath(route: string, isCollection?: boolean) {
    return VerifyPath(spec, route, path => path.get, isCollection, false, '#/definitions/UserResponseModel');
  }
});
