import type { Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { checkerMetadata, refOf, returnTypeOf } from './helpers';

const propertyTypes = (ref: Tsoa.ReferenceType) => {
  const body = ref.dataType === 'refAlias' ? ref.type : ref;
  return Object.fromEntries((body as Tsoa.RefObjectType).properties.map(p => [p.name, p.type]));
};

describe('checker resolver final-review regressions', () => {
  const md = checkerMetadata('review.ts', { strict: true });

  it('never builds a generic model from another instantiation of the same generic', () => {
    expect(propertyTypes(refOf(md, 'Result_number_')).value).to.deep.equal({ dataType: 'double' });
    expect(propertyTypes(refOf(md, 'Result_string_')).value).to.deep.equal({ dataType: 'string' });
  });

  it('keeps written order when a union holds two instantiations of one generic', () => {
    expect(((refOf(md, 'Either_string.number_') as Tsoa.RefAliasType).type as Tsoa.UnionType).types.map(t => (t as Tsoa.ReferenceType).refName)).to.deep.equal(['Result_string_', 'Result_number_']);
  });

  it('inherits alias bases of generic interfaces instantiated', () => {
    const wrapped = propertyTypes(refOf(md, 'Wrapped_User_'));
    expect(Object.keys(wrapped)).to.deep.equal(['value', 'meta']);
    expect(wrapped.value).to.include({ refName: 'User' });
    expect(md.referenceTypeMap).not.to.have.property('Based_User_');
  });

  it('never caches an uninstantiated alias base under an instantiated name (output independent of order)', () => {
    // TypeScript rejects `interface Envelope<T> extends Patch<T>` (TS2312) and gives it no Patch members.
    expect((refOf(md, 'Envelope_User_') as Tsoa.RefObjectType).properties.map(p => p.name)).to.deep.equal(['meta']);
    expect(Object.keys(propertyTypes(refOf(md, 'Patch_User_')))).to.deep.equal(['id']);
  });

  it('keeps aliases of optional generic members in strict mode', () => {
    expect(propertyTypes(refOf(md, 'Box_User_')).opt).to.include({ dataType: 'refAlias', refName: 'Maybe_User_' });
  });

  it('aligns tuple spreads with the checker elements', () => {
    const tuple = returnTypeOf(md, 'spread') as Tsoa.TupleType;
    expect(tuple.types.map(t => (t as Tsoa.ReferenceType).refName)).to.deep.equal(['User', 'Admin', 'Order']);
  });
});
