import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { resolveTypeResolverMode } from '@tsoa/cli/metadataGeneration/typeResolverMode';
import { expect } from 'chai';
import 'mocha';

describe('typeResolver mode selection', () => {
  it('defaults to legacy', () => {
    expect(resolveTypeResolverMode(undefined, {})).to.equal('legacy');
  });

  it('reads TSOA_TYPE_RESOLVER', () => {
    expect(resolveTypeResolverMode(undefined, { TSOA_TYPE_RESOLVER: 'checker' })).to.equal('checker');
  });

  it('prefers the explicit option over the environment', () => {
    expect(resolveTypeResolverMode('legacy', { TSOA_TYPE_RESOLVER: 'checker' })).to.equal('legacy');
  });

  it('rejects unknown environment values', () => {
    expect(() => resolveTypeResolverMode(undefined, { TSOA_TYPE_RESOLVER: 'fast' })).to.throw(/TSOA_TYPE_RESOLVER must be 'legacy' or 'checker', got 'fast'/);
  });

  it('rejects unknown explicit values (e.g. from tsoa.json)', () => {
    expect(() => resolveTypeResolverMode('Checker' as never, {})).to.throw(/typeResolver must be 'legacy' or 'checker', got 'Checker'/);
  });

  it('exposes the chosen mode on MetadataGenerator', () => {
    const generator = new MetadataGenerator('./fixtures/controllers/getController.ts', undefined, undefined, undefined, [], 'double', false, 'checker');
    expect(generator.typeResolverMode).to.equal('checker');
  });
});
