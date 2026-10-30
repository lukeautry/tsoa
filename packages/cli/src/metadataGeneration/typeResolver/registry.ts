import type { Tsoa } from '@tsoa/runtime';
import type * as ts from 'typescript';
import { GenerateMetadataError } from '../exceptions';
import type { MetadataGenerator } from '../metadataGenerator';
import { sameType } from './internals';

/**
 * Named models for one MetadataGenerator, keyed by refName (the public contract).
 * A model referenced while it is being built (a cycle) gets a shell that is filled in
 * once the model is complete, so every holder sees the final value.
 */
export class ReferenceRegistry {
  private readonly built = new Map<string, Tsoa.ReferenceType>();
  private readonly types = new Map<string, ts.Type>();
  private readonly shells = new Map<string, Tsoa.ReferenceType[]>();

  constructor(private readonly generator: MetadataGenerator) {}

  /** `register: false` builds (and caches) the model without adding it to the metadata, as for heritage bases. */
  public reference(refName: string, type: ts.Type, build: () => Tsoa.ReferenceType, register = true): Tsoa.ReferenceType {
    // One refName, one type: a model must never be built from a type it does not describe.
    const known = this.types.get(refName);
    if (known && !sameType(this.generator.typeChecker, known, type)) {
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
      if (register) {
        this.generator.AddReferenceType(result);
      }
      return result;
    } finally {
      this.shells.delete(refName);
    }
  }
}
