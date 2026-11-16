import { expect } from 'chai';
import 'mocha';
import { unorderedSchema } from '../../utils/unorderedSchema';

describe('unorderedSchema', () => {
  const unionOrderedKeys = ['enum', 'enums', 'required', 'anyOf', 'oneOf', 'allOf', 'subSchemas', 'types'];

  it('ignores the order of every union-ordered list', () => {
    for (const key of unionOrderedKeys) {
      expect(unorderedSchema({ [key]: ['b', 'a'] }), key).to.deep.equal(unorderedSchema({ [key]: ['a', 'b'] }));
    }
  });

  it('ignores object key order and does not mutate its input', () => {
    const lists = {
      enum: ['b', 'a'],
      enums: ['b', 'a'],
      required: ['b', 'a'],
      anyOf: [{ type: 'string' }, { type: 'number' }],
      oneOf: ['b', 'a'],
      allOf: ['b', 'a'],
      subSchemas: ['b', 'a'],
      types: ['b', 'a'],
    };
    const original = JSON.stringify(lists);
    const reversed = Object.fromEntries(
      Object.entries(lists)
        .reverse()
        .map(([key, values]) => [key, [...values].reverse()]),
    );
    expect(unorderedSchema(lists)).to.deep.equal(unorderedSchema(reversed));
    expect(JSON.stringify(lists)).to.equal(original);
    expect(Object.keys(unorderedSchema(lists) as object)).to.deep.equal(['allOf', 'anyOf', 'enum', 'enums', 'oneOf', 'required', 'subSchemas', 'types']);
  });

  it('keeps tuple, parameter and other array order', () => {
    for (const key of ['items', 'parameters', 'properties', 'routes', 'paths', 'example', 'examples']) {
      expect(unorderedSchema({ [key]: ['a', 'b'] }), key).not.to.deep.equal(unorderedSchema({ [key]: ['b', 'a'] }));
    }
    expect(unorderedSchema(['a', 'b'])).not.to.deep.equal(unorderedSchema(['b', 'a']));
  });

  it('preserves duplicates and nesting', () => {
    expect(unorderedSchema({ enum: ['b', 'a', 'a'] })).to.deep.equal(unorderedSchema({ enum: ['a', 'b', 'a'] }));
    expect(unorderedSchema({ enum: ['a', 'a', 'b'] })).not.to.deep.equal(unorderedSchema({ enum: ['a', 'b'] }));
    expect(unorderedSchema({ enum: [['a', 'b']] })).not.to.deep.equal(unorderedSchema({ enum: ['a', 'b'] }));
  });

  it('still detects a different member', () => {
    expect(unorderedSchema({ enum: ['a', 'b'] })).not.to.deep.equal(unorderedSchema({ enum: ['a', 'c'] }));
    expect(unorderedSchema({ anyOf: [{ enum: ['a', 'b'] }] })).not.to.deep.equal(unorderedSchema({ anyOf: [{ enum: ['a', 'c'] }] }));
  });

  it('normalizes nested unordered lists before comparing anyOf members', () => {
    expect(
      unorderedSchema({
        anyOf: [
          { type: 'string', enum: ['b', 'a'] },
          { type: 'object', required: ['y', 'x'] },
        ],
      }),
    ).to.deep.equal(
      unorderedSchema({
        anyOf: [
          { required: ['x', 'y'], type: 'object' },
          { enum: ['a', 'b'], type: 'string' },
        ],
      }),
    );
  });
});
