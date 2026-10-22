/**
 * This model deliberately deviates from the canonical declaration in designatedModel.ts to make
 * sure the test would fail if this declaration is chosen over the one marked with '@tsoaModel'.
 */
export interface DesignatedDuplicateModel {
  wrongValue: number;
}

export interface DuplicateDesignatedModelHolder {
  model: DesignatedDuplicateModel;
}
