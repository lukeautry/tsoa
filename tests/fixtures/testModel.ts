/**
 * This is a description of a model
 */
export interface TestModel extends Model {
  /**
   * This is a description of this model property, numberValue
   */
  numberValue: number;
  numberArray: number[];
  stringValue: string;
  stringArray: string[];
  boolValue: boolean;
  boolArray: boolean[];
  modelValue: TestSubModel;
  modelsArray: TestSubModel[];
  dateValue?: Date;
  optionalString?: string;
}

export interface TestSubModel extends Model {
  email: string;
}

export interface Model {
  id: number;
}
