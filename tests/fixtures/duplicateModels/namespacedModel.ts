/**
 * @tsoaModel
 */
export interface NamespacedDuplicateModel {
  canonical: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DuplicateModelNs {
  export interface NamespacedDuplicateModel {
    nested: number;
  }
}

export interface NamespacedModelHolderA {
  model: NamespacedDuplicateModel;
}

export interface NamespacedModelHolderB {
  model: DuplicateModelNs.NamespacedDuplicateModel;
}
