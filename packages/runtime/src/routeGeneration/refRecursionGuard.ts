/**
 * Tracks the refs a value is being validated against, shared by a ValidationService and the child services it
 * creates for unions and intersections. Recursive schemas terminate with the input, so only the same value
 * re-entering the same ref makes no progress: the input is cyclic or the schema loops without consuming input.
 * Branches validate clones, so a branch root clone is mapped back to the value it copies.
 */
export class RefRecursionGuard {
  private readonly refsInProgress = new Map<unknown, Set<string>>();
  private readonly cloneSources = new WeakMap<object, unknown>();

  public registerBranchClone(clone: unknown, source: unknown): void {
    if (typeof clone === 'object' && clone !== null) {
      this.cloneSources.set(clone, this.sourceOf(source));
    }
  }

  public enter(value: unknown, ref: string): boolean {
    const source = this.sourceOf(value);
    const activeRefs = this.refsInProgress.get(source) ?? new Set<string>();
    if (activeRefs.has(ref)) {
      return false;
    }
    activeRefs.add(ref);
    this.refsInProgress.set(source, activeRefs);
    return true;
  }

  public leave(value: unknown, ref: string): void {
    const source = this.sourceOf(value);
    const activeRefs = this.refsInProgress.get(source);
    activeRefs?.delete(ref);
    if (activeRefs?.size === 0) {
      this.refsInProgress.delete(source);
    }
  }

  private sourceOf(value: unknown): unknown {
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    return this.cloneSources.get(value) ?? value;
  }
}
