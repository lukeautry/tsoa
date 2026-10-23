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
  const json = JSON.stringify(raw.metadata, (_key, value: unknown) => (typeof value === 'string' ? value.split(root).join('<root>') : value));
  return { metadata: JSON.parse(json) as Tsoa.Metadata };
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
  return known.some(k => k.entry === entry && (path === k.path || path.startsWith(`${k.path}.`) || path.startsWith(`${k.path}[`)));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
