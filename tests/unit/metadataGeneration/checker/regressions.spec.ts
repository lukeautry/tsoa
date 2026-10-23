import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import type { Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { checkerFixture, checkerMetadata, refOf, returnTypeOf } from './helpers';

const body = (type: Tsoa.Type): Tsoa.Type => (type.dataType === 'refAlias' ? body(type.type) : type);
const props = (type: Tsoa.Type) => Object.fromEntries((body(type) as Tsoa.NestedObjectLiteralType).properties.map(p => [p.name, p]));

describe('checker resolver regressions (constructs legacy rejects or gets wrong)', () => {
  const md = checkerMetadata('regressions.ts', { strict: true });
  const ret = (method: string) => returnTypeOf(md, method);

  it('legacy rejects this fixture', () => {
    expect(() => new MetadataGenerator(checkerFixture('regressions.ts'), { strict: true }, undefined, undefined, [], 'double', false, 'legacy').Generate()).to.throw();
  });

  it('typeof a const object (repro 01, #737)', () => {
    const cfg = props(refOf(md, 'Cfg'));
    expect(cfg.mode.type).to.deep.equal({ dataType: 'enum', enums: ['a'] });
    expect(cfg.retries.type).to.deep.equal({ dataType: 'enum', enums: [3] });
  });

  it('indexed access by an enum member (repro 02, #1589)', () => {
    expect(props(ret('indexedByEnum')).foo.type).to.deep.equal({ dataType: 'string' });
  });

  it('intrinsic string types (repro 04, #1623)', () => {
    expect(body(props(ret('intrinsic')).v.type)).to.deep.equal({
      dataType: 'union',
      types: [
        { dataType: 'enum', enums: ['ABC'] },
        { dataType: 'enum', enums: ['DEF'] },
      ],
    });
  });

  it('infinite template literals (repro 05, #1784)', () => {
    expect(body(props(ret('template')).id.type)).to.deep.equal({ dataType: 'string' });
  });

  it('Exclude over a discriminated union (repro 15)', () => {
    const excluded = body(ret('exclude')) as Tsoa.UnionType;
    expect(excluded.types.map(member => props(member).type.type)).to.deep.equal([
      { dataType: 'enum', enums: ['a'] },
      { dataType: 'enum', enums: ['b'] },
    ]);
  });

  it('keys and values of a const object (repro 18, #1375)', () => {
    const { r, v } = props(ret('keysAndValues'));
    expect(body(r.type)).to.deep.equal({ dataType: 'enum', enums: ['admin', 'user'] });
    expect(body(v.type)).to.deep.equal({
      dataType: 'union',
      types: [
        { dataType: 'enum', enums: [1] },
        { dataType: 'enum', enums: [2] },
      ],
    });
  });

  it('z.infer of a zod schema (repro 21, review focus 5, #1256)', () => {
    const user = props(ret('zod'));
    expect(user.id).to.include({ required: true });
    expect(user.id.type).to.deep.equal({ dataType: 'string' });
    expect(user.age.required).to.equal(false);
    expect(body(user.age.type)).to.deep.include({ dataType: 'union' });
    expect((body(user.age.type) as Tsoa.UnionType).types).to.deep.include({ dataType: 'double' });
  });
});
