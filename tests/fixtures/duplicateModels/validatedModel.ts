export interface ValidatedDuplicateModel {
  /**
   * @minLength 2
   */
  code: string;
}

export interface ValidatedModelHolderA {
  model: ValidatedDuplicateModel;
}
