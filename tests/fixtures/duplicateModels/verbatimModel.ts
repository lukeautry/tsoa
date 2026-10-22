// Variant A: this file differs from verbatimModelDuplicate.ts, but the declaration below is a
// verbatim copy of the one over there.
export enum VerbatimDuplicateEnum {
  VALUE_A = 'A',
  VALUE_B = 'B',
}

export interface VerbatimModelHolderA {
  value: VerbatimDuplicateEnum;
}
