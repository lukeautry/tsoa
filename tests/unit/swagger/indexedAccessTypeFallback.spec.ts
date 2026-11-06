import { ExtendedSpecConfig } from '@tsoa/cli/cli';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { getDefaultExtendedOptions, getDefaultOptions } from '../../fixtures/defaultOptions';

describe('Indexed access type fallback resolution', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/indexedAccessTypeController.ts').Generate();

  const spec2 = new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec();

  const defaultConfig = getDefaultOptions();
  const spec3Options: ExtendedSpecConfig = {
    ...defaultConfig.spec,
    noImplicitAdditionalProperties: 'ignore',
    entryFile: defaultConfig.entryFile,
  };
  const spec3 = new SpecGenerator3(metadata, spec3Options).GetSpec();

  function resolveSchema3(schema: Swagger.Schema3): Swagger.Schema3 {
    if (schema.$ref) {
      const name = schema.$ref.replace('#/components/schemas/', '');
      const resolved = spec3.components?.schemas?.[name];
      expect(resolved, `component schema '${name}' should exist`).to.exist;
      return resolved as Swagger.Schema3;
    }
    return schema;
  }

  function getResponseSchema3(routePath: string): Swagger.Schema3 {
    const path = spec3.paths[routePath];
    expect(path, `path '${routePath}' should exist`).to.exist;
    expect(path.get, `GET on '${routePath}' should exist`).to.exist;

    const response = path.get!.responses?.['200'] as Swagger.Response3;
    expect(response).to.exist;

    const content = response.content?.['application/json'];
    expect(content).to.exist;

    return resolveSchema3(content!.schema as Swagger.Schema3);
  }

  describe('ForeignIndexedValue (T[keyof U] where T !== U)', () => {
    it('should generate a Swagger 2.0 path', () => {
      const path = spec2.paths['/IndexedAccessType/ForeignIndexedValue'];
      expect(path).to.exist;
      expect(path.get).to.exist;

      const response = path.get!.responses?.['200'];
      expect(response).to.exist;
    });

    it('should resolve to a string enum with the correct value in OpenAPI 3', () => {
      const schema = getResponseSchema3('/IndexedAccessType/ForeignIndexedValue');
      expect(schema.type).to.equal('string');
      expect(schema.enum).to.deep.equal(['FOO']);
    });
  });

  describe('EventUnion (mapped type indexed by type alias)', () => {
    it('should generate a Swagger 2.0 path', () => {
      const path = spec2.paths['/IndexedAccessType/EventUnion'];
      expect(path).to.exist;
      expect(path.get).to.exist;

      const response = path.get!.responses?.['200'];
      expect(response).to.exist;
    });

    it('should resolve to a union of object types in OpenAPI 3', () => {
      const schema = getResponseSchema3('/IndexedAccessType/EventUnion') as any;

      // The resolved union should have anyOf with two object variants
      expect(schema.anyOf).to.be.an('array').with.lengthOf(2);

      // Each variant should have 'kind' and 'payload' properties
      for (const variant of schema.anyOf) {
        const resolved = resolveSchema3(variant);
        const properties = resolved.properties ?? {};
        expect(properties).to.have.property('kind');
        expect(properties).to.have.property('payload');
      }
    });
  });

  describe('ConfigValue (T[AliasOfKeyofT], issue #1622)', () => {
    it('should generate a Swagger 2.0 path', () => {
      const path = spec2.paths['/IndexedAccessType/ConfigValue'];
      expect(path).to.exist;
      expect(path.get).to.exist;

      const response = path.get!.responses?.['200'];
      expect(response).to.exist;
    });

    it('should resolve to a union of the value types in OpenAPI 3', () => {
      const schema = getResponseSchema3('/IndexedAccessType/ConfigValue') as any;

      // ConfigValue = ConfigMap[ConfigKey] = ('A' | 'B') | { name: string; count: number }[]
      expect(schema.anyOf).to.be.an('array').with.lengthOf(2);
    });
  });
});
