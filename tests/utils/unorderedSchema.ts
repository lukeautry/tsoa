const unorderedKeys = new Set(['enum', 'required', 'anyOf', 'oneOf', 'allOf', 'subSchemas']);

/** Compare schema content without depending on the order of set-like lists or object keys. */
export function unorderedSchema(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    const items = value.map(item => unorderedSchema(item));
    return key && unorderedKeys.has(key) ? items.sort((left, right) => (JSON.stringify(left) ?? '').localeCompare(JSON.stringify(right) ?? '')) : items;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, item]) => [name, unorderedSchema(item, name)]),
    );
  }
  return value;
}
