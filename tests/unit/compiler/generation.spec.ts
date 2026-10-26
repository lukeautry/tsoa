import { expect } from 'chai';
import 'mocha';

import generation = require('../../compiler/generation.cjs');

const { normalizeSwagger, assertClassicFailures, baselineInvalidControllers } = generation;

describe('Generation comparison', () => {
  it('generation comparison ignores object key order and only the accepted array orders', () => {
    for (const key of ['enum', 'required', 'anyOf', 'oneOf', 'allOf']) {
      expect(normalizeSwagger({ [key]: [{ type: 'string', nullable: true }, 'value', null] })).to.deep.equal(normalizeSwagger({ [key]: [null, 'value', { nullable: true, type: 'string' }] }));
      expect(normalizeSwagger({ [key]: ['a', 'a'] })).to.not.deep.equal(normalizeSwagger({ [key]: ['a'] }));
      expect(normalizeSwagger({ [key]: ['a', 'b'] })).to.not.deep.equal(normalizeSwagger({ [key]: ['a', 'c'] }));
    }
    expect(normalizeSwagger({ parameters: ['a', 'b'] })).to.not.deep.equal(normalizeSwagger({ parameters: ['b', 'a'] }));
    expect(normalizeSwagger({ enum: [['a', 'b']] })).to.not.deep.equal(normalizeSwagger({ enum: [['b', 'a']] }));
    expect(normalizeSwagger({ required: true })).to.not.deep.equal(normalizeSwagger({ required: false }));
  });

  it('generation comparison accepts only the known DanglingContext JSDoc link rendering', () => {
    const schema = (description: string) => ({ components: { schemas: { DanglingContext_number_: { description } } } });
    const classic = 'the interface {@link TSameNameDifferentValue} is used';
    const native = 'the interface TSameNameDifferentValue is used';
    expect(normalizeSwagger(schema(classic))).to.deep.equal(normalizeSwagger(schema(native)));
    expect(normalizeSwagger(schema(classic))).to.not.deep.equal(normalizeSwagger(schema('different description')));
    expect(normalizeSwagger(schema('{@link Other}'))).to.not.deep.equal(normalizeSwagger(schema('Other')));
    expect(normalizeSwagger({ description: classic })).to.not.deep.equal(normalizeSwagger({ description: native }));
  });

  it('generation comparison rejects changes to the documented classic failure set', () => {
    const reference: Record<string, { status: string }> = Object.fromEntries(baselineInvalidControllers.map(name => [name, { status: 'failed' }]));
    reference.backendController = { status: 'passed' };
    expect(() => assertClassicFailures(reference)).to.not.throw();
    expect(() => assertClassicFailures({ ...reference, backendController: { status: 'failed' } })).to.throw(/Classic failures/);
    expect(() => assertClassicFailures({ ...reference, invalidGetController: { status: 'passed' } })).to.throw(/Classic failures/);
    const { invalidGetController, ...incomplete } = reference;
    expect(() => assertClassicFailures(incomplete)).to.throw(/Classic failures/);
    expect(() => assertClassicFailures({ ...incomplete, backendController: { status: 'failed' } })).to.throw(/Classic failures/);
  });
});
