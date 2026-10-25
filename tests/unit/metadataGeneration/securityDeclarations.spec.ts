import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { GenerateMetadataError } from '@tsoa/cli/metadataGeneration/exceptions';
import { expect } from 'chai';
import 'mocha';

describe('Security declarations', () => {
  const generate = (name: string) => new MetadataGenerator(`./fixtures/securityDeclarations/${name}.ts`).Generate();

  it('keeps the entries of valid declarations', () => {
    const [controller] = generate('valid').controllers;

    expect(Object.fromEntries(controller.methods.map(method => [method.name, method.security]))).to.deep.equal({
      empty: [{}],
      named: [{ api_key: [] }],
      scoped: [{ api_key: ['read'] }],
      and: [{ api_key: ['read'], oauth: [] }],
    });
  });

  for (const [description, name] of [
    ['an object entry named __proto__', 'protoObject'],
    ['an object entry with scopes that cannot be resolved', 'unresolvedScopes'],
    ['a scheme named __proto__ beside an empty entry', 'protoName'],
  ]) {
    it(`refuses ${description}, which would be generated as an entry that allows anonymous access`, () => {
      expect(() => generate(name)).to.throw(GenerateMetadataError, /@Security/);
    });
  }
});
