// Variant B: a different file (so file-level identity does not apply), holding a verbatim copy of
// the declaration in verbatimModel.ts.
export enum VerbatimDuplicateEnum {
  VALUE_A = 'A',
  VALUE_B = 'B',
}

export interface VerbatimModelHolderB {
  value: VerbatimDuplicateEnum;
}
