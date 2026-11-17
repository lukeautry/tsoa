import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { SpecGenerator31 } from '@tsoa/cli/swagger/specGenerator31';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';

describe('QUERY route generation', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/queryMethodController.ts').Generate();

  it('records the QUERY method in the metadata', () => {
    const methods = metadata.controllers[0].methods.map(m => [m.name, m.method, m.path]);
    expect(methods).to.deep.equal([
      ['search', 'query', ''],
      ['searchTenant', 'query', '{tenant}'],
    ]);
  });

  it('documents QUERY under x-oai-additionalOperations in OpenAPI 2', () => {
    const path = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec().paths['/QueryMethodTest'];
    expect(Object.keys(path)).to.deep.equal(['x-oai-additionalOperations']);

    const operation = path['x-oai-additionalOperations']!.QUERY;
    expect(operation.operationId).to.equal('Search');
    expect(operation.parameters!.map(p => [p.in, p.name])).to.deep.equal([
      ['body', 'filter'],
      ['query', 'page'],
    ]);
  });

  for (const [version, Generator] of [
    ['3.0', SpecGenerator3],
    ['3.1', SpecGenerator31],
  ] as const) {
    it(`documents QUERY with a request body under x-oai-additionalOperations in OpenAPI ${version}`, () => {
      const paths = new Generator(metadata, getDefaultExtendedOptions()).GetSpec().paths;
      const search = paths['/QueryMethodTest']['x-oai-additionalOperations']!.QUERY;
      const tenant = paths['/QueryMethodTest/{tenant}']['x-oai-additionalOperations']!.QUERY;

      expect(search.requestBody!.content['application/json'].schema).to.deep.equal({ $ref: '#/components/schemas/ContactFilter' });
      expect(search.parameters!.map(p => [p.in, p.name])).to.deep.equal([['query', 'page']]);
      expect(tenant.parameters!.map(p => [p.in, p.name])).to.deep.equal([['path', 'tenant']]);
    });
  }

  it('rejects @Query on a parameter and names @QueryParam', () => {
    expect(() => new MetadataGenerator('./fixtures/queryMethod/queryAsParameterController.ts').Generate()).to.throw(
      "@Query is the HTTP QUERY method decorator. Use @QueryParam('name') for a query string parameter.",
    );
  });
});
