import type { Tsoa } from '@tsoa/runtime';
import type { KnownDifference } from './knownDifferences';

export type Outcome = { metadata: Tsoa.Metadata } | { error: string };
export interface Difference {
  path: string;
  legacy: unknown;
  checker: unknown;
}

/** Makes an outcome comparable across runs and machines. */
export function normalizeOutcome(raw: { metadata: Tsoa.Metadata } | { error: unknown }, root: string): Outcome {
  if ('error' in raw) {
    const message = raw.error instanceof Error ? raw.error.message : String(raw.error);
    return { error: message.split('\n')[0].split(root).join('<root>') };
  }
  const { referenceTypeMap, ...rest } = raw.metadata;
  const normalized = normalizeValue(rest, root, false) as Record<string, unknown>;
  if (referenceTypeMap) {
    normalized.referenceTypeMap = Object.fromEntries(Object.entries(referenceTypeMap).map(([name, ref]) => [name, normalizeValue(ref, root, true)]));
  }
  return { metadata: normalized as unknown as Tsoa.Metadata };
}

const refTypes = new Set(['refObject', 'refAlias', 'refEnum']);

/**
 * Plain JSON with undefined dropped and the root replaced. References below the top level become
 * `{ $ref: refName }`: their definition is compared once, in referenceTypeMap (this also breaks cycles).
 */
function normalizeValue(value: unknown, root: string, isDefinition: boolean): unknown {
  if (typeof value === 'string') {
    // `new Date()` examples are evaluated at generation time.
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ? '<timestamp>' : value.split(root).join('<root>');
  }
  if (Array.isArray(value)) {
    return value.map(item => (item === undefined ? null : normalizeValue(item, root, false)));
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    if (!isDefinition && refTypes.has(record.dataType as string) && typeof record.refName === 'string') {
      return { $ref: record.refName };
    }
    return Object.fromEntries(
      Object.entries(record)
        .filter(([, v]) => v !== undefined && typeof v !== 'function')
        .map(([k, v]) => [k, normalizeValue(v, root, false)]),
    );
  }
  return value;
}

/** Leaf-level differences between two JSON values; object key order is ignored. */
export function diffJson(legacy: unknown, checker: unknown, path = ''): Difference[] {
  if (isObject(legacy) && isObject(checker)) {
    const keys = [...new Set([...Object.keys(legacy), ...Object.keys(checker)])].sort();
    return keys.flatMap(key => diffJson(legacy[key], checker[key], path ? `${path}.${key}` : key));
  }
  if (Array.isArray(legacy) && Array.isArray(checker)) {
    const length = Math.max(legacy.length, checker.length);
    return Array.from({ length }, (_, i) => diffJson(legacy[i], checker[i], `${path}[${i}]`)).flat();
  }
  return JSON.stringify(legacy) === JSON.stringify(checker) ? [] : [{ path, legacy, checker }];
}

export function isKnown(known: KnownDifference[], entry: string, path: string): boolean {
  return known.some(k => (k.entry === '*' || k.entry === entry) && (path === k.path || path.startsWith(`${k.path}.`) || path.startsWith(`${k.path}[`)));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
