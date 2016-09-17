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

export class TestClassBaseModel {
  public id: number;
}

/**
 * This is a description of TestClassModel
 */
export class TestClassModel extends TestClassBaseModel {
  /**
   * This is a description of a public string property
   */
  public publicStringProperty: string;
  public optionalPublicStringProperty?: string;
  /* tslint:disable-next-line */
  stringProperty: string;
  protected protectedStringProperty: string;

  /**
   * @param publicConstructorVar This is a description for publicConstructorVar
   */
  constructor(
    public publicConstructorVar: string,
    protected protectedConstructorVar: string,
    public optionalPublicConstructorVar?: string
  ) {
    super();
  }
}
