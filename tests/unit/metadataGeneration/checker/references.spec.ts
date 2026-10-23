import type { Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { checkerMetadata, refOf, returnTypeOf } from './helpers';

describe('checker resolver named references', () => {
  const md = checkerMetadata('references.ts', { strict: true });
  const refNameOf = (method: string) => (returnTypeOf(md, method) as Tsoa.ReferenceType).refName;

  it('keeps aliases of primitives as named models with their validators', () => {
    expect(refNameOf('code')).to.equal('Code');
    const code = refOf(md, 'Code') as Tsoa.RefAliasType;
    expect(code.type).to.deep.equal({ dataType: 'string' });
    expect(code.validators.pattern?.value).to.equal('^[0-9]+$');
  });

  it('emits one model per alias name, even when two aliases name the same type (review focus 2)', () => {
    expect((refOf(md, 'A') as Tsoa.RefAliasType).type).to.include({ dataType: 'refAlias', refName: 'Code' });
    expect((refOf(md, 'B') as Tsoa.RefAliasType).type).to.include({ dataType: 'refAlias', refName: 'Code' });
  });

  it('maps enums and enum members', () => {
    const color = refOf(md, 'Color') as Tsoa.RefEnumType;
    expect(color).to.include({ dataType: 'refEnum', description: 'Colors' });
    expect(color.enums).to.deep.equal(['red', 'blue']);
    expect(color.enumVarnames).to.deep.equal(['Red', 'Blue']);
    expect(refNameOf('red')).to.equal('Color.Red');
    expect((refOf(md, 'Color.Red') as Tsoa.RefEnumType).enums).to.deep.equal(['red']);
  });

  it('names renamed, namespace and namespaced imports like legacy', () => {
    expect(refNameOf('beta')).to.equal('Beta');
    expect(refNameOf('alpha')).to.equal('Alpha');
    expect(refNameOf('inner')).to.equal('NS.Inner');
  });

  it('instantiates generic aliases with checker types', () => {
    expect(refNameOf('box')).to.equal('Box_string_');
    expect((refOf(md, 'Box_string_') as Tsoa.RefAliasType).type).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'enum', enums: [null] }] });
  });

  it('keeps no state between generators', () => {
    const other = checkerMetadata('referencesOther.ts', { strict: true });
    expect((refOf(other, 'Code') as Tsoa.RefAliasType).type).to.deep.equal({ dataType: 'double' });
    expect((refOf(checkerMetadata('references.ts', { strict: true }), 'Code') as Tsoa.RefAliasType).type).to.deep.equal({ dataType: 'string' });
  });

  describe('backed by interfaces (needs object members)', () => {
    it.skip('emits A and B for two aliases of one interface', () => {
      const models = checkerMetadata('referenceModels.ts', { strict: true });
      expect((refOf(models, 'A') as Tsoa.RefAliasType).type).to.include({ refName: 'User' });
      expect((refOf(models, 'B') as Tsoa.RefAliasType).type).to.include({ refName: 'User' });
    });

    it.skip('merges interface declarations (review focus 3)', () => {
      const models = checkerMetadata('referenceModels.ts', { strict: true });
      expect((refOf(models, 'Merged') as Tsoa.RefObjectType).properties.map(p => p.name)).to.deep.equal(['a', 'b']);
    });

    it.skip('includes inherited members of recursive models, inherited first (repro 08)', () => {
      const models = checkerMetadata('referenceModels.ts', { strict: true });
      expect((refOf(models, 'Item') as Tsoa.RefObjectType).properties.map(p => p.name)).to.deep.equal(['items', 'name']);
    });
  });
});
