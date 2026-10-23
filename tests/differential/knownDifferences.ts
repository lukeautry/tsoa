/**
 * Differences between the legacy and checker type resolvers that are intended:
 * cases where legacy is wrong (or throws) and the checker resolver is right.
 * `entry` is the fixture path relative to `tests/`; `path` is a JSON path prefix
 * into the normalized outcome (`metadata.…` or `error`).
 */
export interface KnownDifference {
  entry: string;
  path: string;
  reason: string;
  issue?: number;
}

export const knownDifferences: KnownDifference[] = [];
