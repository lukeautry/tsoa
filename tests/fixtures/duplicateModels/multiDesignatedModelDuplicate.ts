/**
 * A second declaration marked with '@tsoaModel' for the same name: the designation is ambiguous.
 * @tsoaModel
 */
export interface MultiDesignatedModel {
  b: number;
}

export interface MultiDesignatedHolderB {
  model: MultiDesignatedModel;
}
