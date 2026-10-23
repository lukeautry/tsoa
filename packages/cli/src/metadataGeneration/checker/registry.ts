import type { Tsoa } from '@tsoa/runtime';
import type { MetadataGenerator } from '../metadataGenerator';

/**
 * Named models for one MetadataGenerator, keyed by refName (the public contract).
 * A model referenced while it is being built (a cycle) gets a shell that is filled in
 * once the model is complete, so every holder sees the final value.
 */
export class ReferenceRegistry {
  private readonly built = new Map<string, Tsoa.ReferenceType>();
  private readonly shells = new Map<string, Tsoa.ReferenceType[]>();

  constructor(private readonly generator: MetadataGenerator) {}

  /** `register: false` builds (and caches) the model without adding it to the metadata, as legacy does for heritage bases. */
  public reference(refName: string, build: () => Tsoa.ReferenceType, register = true): Tsoa.ReferenceType {
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
