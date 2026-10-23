import type { Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { checkerMetadata, refOf, returnTypeOf } from './helpers';

const names = (type: Tsoa.Type) => properties(type).map(p => p.name);

function properties(type: Tsoa.Type): Tsoa.Property[] {
  if (type.dataType === 'refAlias') {
    return properties(type.type);
  }
  if (type.dataType === 'refObject' || type.dataType === 'nestedObjectLiteral') {
    return type.properties;
  }
  throw new Error(`no properties on ${type.dataType}`);
}

describe('checker resolver object members', () => {
  const md = checkerMetadata('members.ts', { strict: true });
  const ret = (method: string) => returnTypeOf(md, method);

  it('keeps validators of aliased property types through Omit (repro 11)', () => {
    const omit = ret('omit') as Tsoa.RefAliasType;
    expect(omit.refName).to.equal('Omit_WithUuid.label_');
    const [id] = properties(omit);
    expect(id.name).to.equal('id');
    expect(id.type).to.include({ dataType: 'refAlias', refName: 'UUID' });
    expect((refOf(md, 'UUID') as Tsoa.RefAliasType).validators.pattern?.value).to.equal('^[0-9a-f-]{36}$');
  });

  it('instantiates utility types inside generic aliases (repro 06)', () => {
    const only = refOf(md, 'OnlyRequire_User.id_') as Tsoa.RefAliasType;
    const [partial, required] = (only.type as Tsoa.IntersectionType).types;
    expect(partial).to.include({ refName: 'Partial_User_' });
    expect(properties(partial).map(p => [p.name, p.required])).to.deep.equal([
      ['id', false],
      ['name', false],
      ['email', false],
      ['age', false],
    ]);
    expect(required).to.include({ refName: 'Required_Pick_User.id__' });
    expect(properties(required).map(p => [p.name, p.required])).to.deep.equal([['id', true]]);
  });

  it('remaps keys with `as` (repro 13)', () => {
    expect(names(ret('getters'))).to.deep.equal(['getId', 'getAge']);
  });

  it('names nested generic instantiations like legacy', () => {
    const env = ret('env') as Tsoa.RefObjectType;
    expect(env.refName).to.equal('Envelope_Page_Partial_User___');
    const data = properties(refOf(md, env.refName)).find(p => p.name === 'data')!;
    expect(data.type).to.include({ refName: 'Page_Partial_User__' });
    const items = properties(refOf(md, 'Page_Partial_User__')).find(p => p.name === 'items')!;
    expect((items.type as Tsoa.ArrayType).elementType).to.include({ refName: 'Partial_User_' });
  });

  it('takes public instance fields, then constructor parameter properties', () => {
    const account = refOf(md, 'Account') as Tsoa.RefObjectType;
    expect(account.properties.map(p => [p.name, p.required])).to.deep.equal([
      ['id', true],
      ['kind', false],
      ['owner', true],
      ['tier', true],
    ]);
    expect(account.properties[1].type).to.deep.equal({ dataType: 'enum', enums: ['a'] });
  });

  it('uses toJSON for the shape', () => {
    const jsonable = refOf(md, 'Jsonable') as Tsoa.RefAliasType;
    expect(jsonable.dataType).to.equal('refAlias');
    expect(names(jsonable.type)).to.deep.equal(['a']);
    expect(properties(jsonable.type)[0].type).to.deep.equal({ dataType: 'string' });
  });

  it('maps string index signatures to additionalProperties', () => {
    expect((refOf(md, 'Dict') as Tsoa.RefObjectType).additionalProperties).to.deep.equal({
      dataType: 'union',
      types: [{ dataType: 'string' }, { dataType: 'enum', enums: [null] }],
    });
  });

  it('terminates on recursive generic aliases (review focus 4)', () => {
    const tree = ret('tree') as Tsoa.RefAliasType;
    expect(tree.refName).to.equal('RecursivePartial_Tree_');
    expect(names(tree)).to.deep.equal(['children', 'label']);
  });

  it('lists written object literal members in legacy (reverse) order', () => {
    const literal = ret('literal') as Tsoa.NestedObjectLiteralType;
    expect(literal.properties.map(p => [p.name, p.required])).to.deep.equal([
      ['a', false],
      ['b', true],
    ]);
    expect(literal.properties[0].type).to.deep.equal({ dataType: 'double' });
  });
});
