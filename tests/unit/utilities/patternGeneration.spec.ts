import { knownLimit } from '../../utils/knownLimit';
import { withCompiler } from '@tsoa/cli/compiler';
import { expect } from 'chai';
import 'mocha';
import { normalize } from 'path';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { GenerateMetadataError } from '@tsoa/cli/metadataGeneration/exceptions';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

describe('Pattern generation', () => {
  it('preserves quoted spaces in body properties and query parameters', () => {
    return withCompiler(() => {
      const metadata = new MetadataGenerator('./fixtures/patterns/quoted.ts').Generate();
      const body = metadata.referenceTypeMap.PatternBody;
      if (body.dataType !== 'refObject') {
        throw new Error('Expected PatternBody to be an object');
      }
      expect(body.properties.find(property => property.name === 'value')?.validators.pattern).to.deep.equal({
        value: '^[a-z ]+$',
        errorMsg: 'Only letters and spaces',
      });
      expect(metadata.controllers[0].methods[0].parameters.find(parameter => parameter.in === 'query')?.validators.pattern).to.deep.equal({
        value: '^a b$',
        errorMsg: 'Expected a b',
      });

      const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
      expect(spec.components.schemas?.PatternBody.properties?.value.pattern).to.equal('^[a-z ]+$');
      expect(spec.paths['/Patterns'].post?.parameters?.find(parameter => parameter.in === 'query')?.schema.pattern).to.equal('^a b$');
    });
  });

  for (const { fixture, line, annotation } of [
    { fixture: 'invalidProperty.ts', line: 4, annotation: '/** @pattern `^a\\` b$` Invalid value */' },
    { fixture: 'invalidParameter.ts', line: 5, annotation: '/** @pattern value `^a\\` b$` Invalid value */' },
  ]) {
    // COMPILERS.md limit: absolute annotation error paths.
    it(`reports the invalid annotation location in ${fixture}`, () =>
      knownLimit(
        ['typescript@7.0.2', 'typescript@7.1.0-beta', 'tsrs@0.20.0-ts7.1.0-beta'],
        new RegExp(`to include 'At: fixtures[/\\\\]patterns[/\\\\]${fixture === 'invalidParameter.ts' ? 'invalidParamete' : 'invalidProperty'}…'$`),
      )(() => {
        return withCompiler(() => {
          expect(() => new MetadataGenerator(`./fixtures/patterns/${fixture}`).Generate())
            .to.throw(GenerateMetadataError)
            .with.property('message')
            .that.includes(`Invalid @pattern ${JSON.stringify('^a\\')}`)
            .and.includes('Invalid regular expression:')
            .and.includes(`At: ${normalize(`fixtures/patterns/${fixture}:${line}:${line}`)}.`)
            .and.includes(annotation);
        });
      }));
  }
});
