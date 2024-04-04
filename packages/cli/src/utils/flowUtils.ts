export function throwUnless(condition: unknown, error: Error): asserts condition {
  if (!condition) throw error;
}
