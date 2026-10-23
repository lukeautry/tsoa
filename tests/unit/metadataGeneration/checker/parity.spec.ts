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
});
