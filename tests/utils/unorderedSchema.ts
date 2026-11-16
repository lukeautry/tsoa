const unionOrderedKeys = new Set(['enum', 'enums', 'required', 'anyOf', 'oneOf', 'allOf', 'subSchemas', 'types']);

const byJson = (left: unknown, right: unknown): number => {
  const a = JSON.stringify(left) ?? '';
  const b = JSON.stringify(right) ?? '';
  return a < b ? -1 : a > b ? 1 : 0;
};

/**
 * Returns a copy of `value` with object keys sorted and the items of union-ordered lists sorted, recursively.
 * TypeScript 6 and 7 order union members differently, so tests compare these lists as multisets.
 * Every other array keeps its order.
 */
export function unorderedSchema(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    const items = value.map(item => unorderedSchema(item));
    return key !== undefined && unionOrderedKeys.has(key) ? items.sort(byJson) : items;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([name, item]) => [name, unorderedSchema(item, name)]),
    );
  }
  return value;
}
