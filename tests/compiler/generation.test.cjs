const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeSwagger } = require('./generation.cjs');

test('generation comparison ignores object key order and only the accepted array orders', () => {
  for (const key of ['enum', 'required', 'anyOf', 'oneOf', 'allOf']) {
    assert.deepEqual(normalizeSwagger({ [key]: [{ type: 'string', nullable: true }, 'value', null] }), normalizeSwagger({ [key]: [null, 'value', { nullable: true, type: 'string' }] }));
    assert.notDeepEqual(normalizeSwagger({ [key]: ['a', 'a'] }), normalizeSwagger({ [key]: ['a'] }));
    assert.notDeepEqual(normalizeSwagger({ [key]: ['a', 'b'] }), normalizeSwagger({ [key]: ['a', 'c'] }));
  }
  assert.notDeepEqual(normalizeSwagger({ parameters: ['a', 'b'] }), normalizeSwagger({ parameters: ['b', 'a'] }));
  assert.notDeepEqual(normalizeSwagger({ enum: [['a', 'b']] }), normalizeSwagger({ enum: [['b', 'a']] }));
  assert.notDeepEqual(normalizeSwagger({ required: true }), normalizeSwagger({ required: false }));
});

test('generation comparison accepts only the known DanglingContext JSDoc link rendering', () => {
  const schema = description => ({ components: { schemas: { DanglingContext_number_: { description } } } });
  const classic = 'the interface {@link TSameNameDifferentValue} is used';
  const native = 'the interface TSameNameDifferentValue is used';
  assert.deepEqual(normalizeSwagger(schema(classic)), normalizeSwagger(schema(native)));
  assert.notDeepEqual(normalizeSwagger(schema(classic)), normalizeSwagger(schema('different description')));
  assert.notDeepEqual(normalizeSwagger(schema('{@link Other}')), normalizeSwagger(schema('Other')));
  assert.notDeepEqual(normalizeSwagger({ description: classic }), normalizeSwagger({ description: native }));
});
