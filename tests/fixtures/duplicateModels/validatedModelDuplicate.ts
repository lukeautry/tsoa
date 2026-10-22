// Same property names and types as validatedModel.ts, but without the @minLength validator - the
// kind of metadata-stripped copy a generated declaration file carries. The two declarations are
// one model; the validators of whichever declaration is rendered apply.
export interface ValidatedDuplicateModel {
  code: string;
}

export interface ValidatedModelHolderB {
  model: ValidatedDuplicateModel;
}
