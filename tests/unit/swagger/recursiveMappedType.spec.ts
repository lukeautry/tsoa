import { ExtendedSpecConfig } from '@tsoa/cli/cli';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { getDefaultOptions } from '../../fixtures/defaultOptions';

describe('Recursive generic mapped types (strictNullChecks)', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/recursiveMappedTypeController.ts', { strictNullChecks: true }).Generate();
  const defaultConfig = getDefaultOptions();
  const options: ExtendedSpecConfig = {
    ...defaultConfig.spec,
    noImplicitAdditionalProperties: 'ignore',
    entryFile: defaultConfig.entryFile,
  };
  const spec: Swagger.Spec3 = new SpecGenerator3(metadata, options).GetSpec();

  const schemas = spec.components.schemas as Record<string, Swagger.Schema3>;
  const resolve = (schema: Swagger.Schema3 | undefined): Swagger.Schema3 => {
    expect(schema).to.exist;
    if (schema?.$ref) {
      return resolve(schemas[schema.$ref.replace('#/components/schemas/', '')]);
    }
    const branch = (schema?.anyOf ?? schema?.allOf)?.find(s => s.$ref || s.properties);
    return branch ? resolve(branch as Swagger.Schema3) : (schema as Swagger.Schema3);
  };
  const bodyOf = (path: string) => (spec.paths[path].patch?.requestBody as Swagger.RequestBody).content['application/json'].schema as Swagger.Schema3;

  for (const [name, path] of [
    ['DeepPartial', '/RecursiveMappedType/DeepPartial'],
    ['MergePatch', '/RecursiveMappedType/MergePatch'],
  ] as const) {
    it(`keeps the properties of every nested ${name} instantiation, all optional`, () => {
      const target = resolve(bodyOf(path));
      expect(Object.keys(target.properties ?? {})).to.deep.eq(['a', 'nested']);
      expect(target.required).to.eq(undefined);

      const nested = resolve(target.properties?.nested);
      expect(Object.keys(nested.properties ?? {})).to.deep.eq(['b', 'deeper']);
      expect(nested.required).to.eq(undefined);

      const deeper = resolve(nested.properties?.deeper);
      expect(Object.keys(deeper.properties ?? {})).to.deep.eq(['c']);
      expect(deeper.required).to.eq(undefined);
    });
  }

  it('keeps `null` on the nested properties of a MergePatch', () => {
    const target = resolve(bodyOf('/RecursiveMappedType/MergePatch'));
    const nested = resolve(target.properties?.nested);
    expect(JSON.stringify(nested.properties?.b)).to.contain('"nullable":true');
  });
});
