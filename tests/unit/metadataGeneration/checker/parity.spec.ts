import type { Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { checkerMetadata, refOf, returnTypeOf } from './helpers';

const body = (type: Tsoa.Type): Tsoa.Type => (type.dataType === 'refAlias' ? type.type : type);

describe('checker resolver parity with legacy naming of evaluated types', () => {
  const md = checkerMetadata('parity.ts', { strict: true });
  const ret = (method: string) => returnTypeOf(md, method);

  it('names the result of a conditional type as the checker prints it', () => {
    expect(body(ret('exclude'))).to.include({ dataType: 'refObject', refName: 'Second' });
    expect(body(ret('excludeEnum'))).to.include({ dataType: 'refEnum', refName: 'Letters' });
  });

  it('resolves indexed access through the property declaration', () => {
    expect(ret('indexed')).to.include({ dataType: 'refAlias', refName: 'TargetAlias' });
  });

  it('maps unwritten literal unions to one enum per member', () => {
    const v = (ret('values') as Tsoa.NestedObjectLiteralType).properties[0].type;
    expect(v).to.deep.equal({
      dataType: 'union',
      types: [
        { dataType: 'enum', enums: ['x'] },
        { dataType: 'enum', enums: ['y'] },
      ],
    });
  });

  it('keeps written union order and names inside generic aliases', () => {
    const forward = refOf(md, 'Forward_boolean.Target_') as Tsoa.RefAliasType;
    expect((forward.type as Tsoa.UnionType).types.map(t => (t as Tsoa.ReferenceType).refName ?? t.dataType)).to.deep.equal(['Identity_Target_', 'boolean']);
  });

  it('keeps members of mapped types over unions inline', () => {
    const distributed = body(ret('distributed')) as Tsoa.UnionType;
    expect(distributed.dataType).to.equal('union');
    expect(distributed.types.map(t => t.dataType)).to.deep.equal(['nestedObjectLiteral', 'nestedObjectLiteral']);
  });

  it('inherits properties from alias bases without registering them', () => {
    expect((refOf(md, 'Inheriting') as Tsoa.RefObjectType).properties.map(p => [p.name, p.required])).to.deep.equal([
      ['v', true],
      ['t', false],
    ]);
    expect(md.referenceTypeMap).not.to.have.property('Base');
  });

  describe('non-strict programs', () => {
    const loose = checkerMetadata('parity.ts');
    it('keeps written aliases of null in unions', () => {
      const body = refOf(loose, 'NullUnionBody') as Tsoa.RefObjectType;
      expect(body.properties.map(p => (p.type as Tsoa.UnionType).types.map(t => (t as Tsoa.ReferenceType).refName ?? t.dataType))).to.deep.equal([
        ['boolean', 'NullAlias'],
        ['boolean', 'IndirectNull'],
      ]);
    });
  });

  it('does not let an alias name itself when its body is evaluated', () => {
    expect((refOf(md, 'ValueOf') as Tsoa.RefAliasType).type).to.deep.equal({
      dataType: 'union',
      types: [
        { dataType: 'enum', enums: ['x'] },
        { dataType: 'enum', enums: ['y'] },
      ],
    });
  });

  it('keeps written intersection members even when the checker flattens or distributes them', () => {
    const names = (refName: string) => ((refOf(md, refName) as Tsoa.RefAliasType).type as Tsoa.IntersectionType).types.map(t => (t as Tsoa.ReferenceType).refName);
    expect(names('Triple')).to.deep.equal(['Pair', 'Target']);
    expect(names('Distributed')).to.deep.equal(['OneOrTwo', 'Target']);
  });

  it('does not use an original property type as a hint when a mapped type transforms it', () => {
    const deep = refOf(md, 'DeepPartial_Leaf_') as Tsoa.RefAliasType;
    // strict mode: `leaves?: (DeepPartial<Leaf> | undefined)[] | undefined`
    const leaves = (deep.type as Tsoa.NestedObjectLiteralType).properties[0].type as Tsoa.UnionType;
    const array = leaves.types.find((t): t is Tsoa.ArrayType => t.dataType === 'array')!;
    expect((array.elementType as Tsoa.UnionType).types).to.deep.include({ dataType: 'undefined' });
    expect((array.elementType as Tsoa.UnionType).types.map(t => (t as Tsoa.ReferenceType).refName)).to.include('DeepPartial_Leaf_');
  });

  it('keeps properties declared by object literals (typeof, z.infer)', () => {
    expect(((refOf(checkerMetadata('parityTypeof.ts', { strict: true }), 'Shape') as Tsoa.RefAliasType).type as Tsoa.NestedObjectLiteralType).properties.map(p => p.name)).to.have.members([
      'id',
      'count',
    ]);
  });

  it('reads indexed access through the property node but keeps the outer JSDoc (legacy)', () => {
    const loose = checkerMetadata('parity.ts');
    const [only, element] = (refOf(loose, 'UsesFormats') as Tsoa.RefObjectType).properties;
    expect(only.type).to.deep.equal({ dataType: 'double' });
    expect((element.type as Tsoa.NestedObjectLiteralType).properties[0].type).to.deep.equal({
      dataType: 'union',
      types: [
        { dataType: 'enum', enums: ['lit'] },
        { dataType: 'enum', enums: [null] },
      ],
    });
  });

  it('resolves optional generic properties without the undefined strict mode adds', () => {
    const owner = refOf(md, 'GenericOwner') as Tsoa.RefObjectType;
    const [nested, either] = owner.properties;
    expect(nested.type).to.include({ dataType: 'refObject', refName: 'Wrapper_string_' });
    expect((refOf(md, 'Wrapper_string_') as Tsoa.RefObjectType).properties[0].type).to.deep.equal({ dataType: 'string' });
    expect(either.type).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'double' }] });
  });

  it('lists null and undefined last in unions with no written form (legacy printing order)', () => {
    const md2 = checkerMetadata('parity.ts', { strict: true });
    const partial = refOf(md2, 'DeepPartial_Leaf_') as Tsoa.RefAliasType;
    const leaves = (partial.type as Tsoa.NestedObjectLiteralType).properties[0].type as Tsoa.UnionType;
    expect(leaves.types.map(t => t.dataType)).to.deep.equal(['array', 'undefined']);
  });

  it('keeps the inferred undefined of unannotated optional class fields (legacy printed it)', () => {
    const [annotated, inferred] = (refOf(md, 'Defaults') as Tsoa.RefObjectType).properties;
    expect(annotated.type).to.deep.equal({ dataType: 'boolean' });
    expect(inferred.type).to.deep.equal({ dataType: 'union', types: [{ dataType: 'boolean' }, { dataType: 'undefined' }] });
  });
});
