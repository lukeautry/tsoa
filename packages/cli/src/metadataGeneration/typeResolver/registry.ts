import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { GenerateMetadataError } from '../exceptions';
import type { MetadataGenerator } from '../metadataGenerator';

/**
 * Named models for one MetadataGenerator, keyed by refName (the public contract).
 * A model referenced while it is being built (a cycle) gets a shell that is filled in
 * once the model is complete, so every holder sees the final value.
 */
export class ReferenceRegistry {
  private readonly built = new Map<string, Tsoa.ReferenceType>();
  private readonly types = new Map<string, ts.Type>();
  private readonly shells = new Map<string, Tsoa.ReferenceType[]>();
  /** Models under construction that a reference asked to register (e.g. a heritage base that refers to itself). */
  private readonly requested = new Set<string>();

  constructor(private readonly generator: MetadataGenerator) {}

  /** `register: false` builds (and caches) the model without adding it to the metadata, as for heritage bases. */
  public reference(refName: string, type: ts.Type, build: () => Tsoa.ReferenceType, register = true): Tsoa.ReferenceType {
    // One refName, one type: a model must never be built from a type it does not describe.
    const known = this.types.get(refName);
    if (known && !mutuallyAssignable(this.generator.typeChecker, known, type)) {
      throw new GenerateMetadataError(`Found 2 different types for model ${refName}. Give one of them its own name, e.g. with a type alias.`);
    }
    this.types.set(refName, type);
    const existing = this.built.get(refName);
    if (existing) {
      if (register) {
        this.generator.AddReferenceType(existing);
      }
      return existing;
    }

    const waiting = this.shells.get(refName);
    if (waiting) {
      if (register) {
        this.requested.add(refName);
      }
      const shell = { dataType: 'refObject', refName } as Tsoa.ReferenceType;
      waiting.push(shell);
      return shell;
    }

    this.shells.set(refName, []);
    try {
      const result = build();
      for (const shell of this.shells.get(refName) ?? []) {
        Object.assign(shell, result);
      }
      this.built.set(refName, result);
      if (register || this.requested.has(refName)) {
        this.generator.AddReferenceType(result);
      }
      return result;
    } finally {
      this.shells.delete(refName);
      this.requested.delete(refName);
    }
  }
}

/**
 * Whether each type can be assigned to the other, so one model may stand for both (two written
 * literals `{ a: string }` are distinct types but describe the same model). Identical types and
 * unions or intersections of the same members are accepted without asking the checker, which
 * is all that is checked where `isTypeAssignableTo` is unavailable (it is public from TypeScript 5.4).
 */
function mutuallyAssignable(checker: ts.TypeChecker, a: ts.Type, b: ts.Type): boolean {
  if (a === b) {
    return true;
  }
  const members = (t: ts.Type) => (t.isUnionOrIntersection() ? t.types : undefined);
  const ma = members(a);
  const mb = members(b);
  if (ma && mb && (a.flags & ts.TypeFlags.Union) === (b.flags & ts.TypeFlags.Union) && ma.length === mb.length && ma.every(m => mb.includes(m))) {
    return true;
  }
  const assignable = (checker as { isTypeAssignableTo?: (source: ts.Type, target: ts.Type) => boolean }).isTypeAssignableTo;
  return assignable ? assignable.call(checker, a, b) && assignable.call(checker, b, a) : false;
}
