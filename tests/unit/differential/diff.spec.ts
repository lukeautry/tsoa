import type { Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { diffJson, isKnown, normalizeOutcome } from '../../differential/diff';

describe('resolver differential diff', () => {
  it('reports no differences for deeply equal values regardless of key order', () => {
    expect(diffJson({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).to.deep.equal([]);
  });

  it('reports leaf paths that differ', () => {
    expect(diffJson({ a: { b: 1, c: 2 } }, { a: { b: 1, c: 3 } })).to.deep.equal([{ path: 'a.c', legacy: 2, checker: 3 }]);
  });

  it('reports missing keys and array length differences', () => {
    expect(diffJson({ a: [1] }, { a: [1, 2], z: true })).to.deep.equal([
      { path: 'a[1]', legacy: undefined, checker: 2 },
      { path: 'z', legacy: undefined, checker: true },
    ]);
  });

  it('normalizes errors to their first line with the repo root replaced', () => {
    const outcome = normalizeOutcome({ error: new Error('Unknown type: X\n at /repo/tests/a.ts') }, '/repo');
    expect(outcome).to.deep.equal({ error: 'Unknown type: X' });
  });

  it('drops undefined-valued keys and replaces the root in strings', () => {
    expect(normalizeOutcome({ metadata: { a: undefined, b: '/repo/x.ts' } as any }, '/repo')).to.deep.equal({ metadata: { b: '<root>/x.ts' } });
  });

  it('matches known differences by entry and path prefix', () => {
    const known = [{ entry: 'fixtures/a.ts', path: 'referenceTypeMap.Foo', reason: 'r' }];
    expect(isKnown(known, 'fixtures/a.ts', 'referenceTypeMap.Foo.type.dataType')).to.equal(true);
    expect(isKnown(known, 'fixtures/a.ts', 'referenceTypeMap.Foobar')).to.equal(false);
    expect(isKnown(known, 'fixtures/b.ts', 'referenceTypeMap.Foo')).to.equal(false);
  });

  it('replaces nested references by their refName so cyclic metadata can be compared', () => {
    const user: { dataType: string; refName: string; properties: Array<{ name: string; type: unknown }> } = { dataType: 'refObject', refName: 'User', properties: [] };
    user.properties.push({ name: 'self', type: user });
    const metadata = { controllers: [{ methods: [{ type: user }] }], referenceTypeMap: { User: user } };
    expect(normalizeOutcome({ metadata: metadata as unknown as Tsoa.Metadata }, '/repo')).to.deep.equal({
      metadata: {
        controllers: [{ methods: [{ type: { $ref: 'User' } }] }],
        referenceTypeMap: { User: { dataType: 'refObject', refName: 'User', properties: [{ name: 'self', type: { $ref: 'User' } }] } },
      },
    });
  });

  it('replaces generation-time timestamps', () => {
    expect(normalizeOutcome({ metadata: { controllers: [{ example: '2026-10-23T19:47:02.053Z' }] } as any }, '/repo')).to.deep.equal({ metadata: { controllers: [{ example: '<timestamp>' }] } });
  });
});
