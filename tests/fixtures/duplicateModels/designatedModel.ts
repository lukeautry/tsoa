/**
 * The canonical model for this name, marked with '@tsoaModel'.
 * @tsoaModel
 */
export interface DesignatedDuplicateModel {
  canonicalValue: string;
}

export interface DesignatedModelHolder {
  model: DesignatedDuplicateModel;
}
