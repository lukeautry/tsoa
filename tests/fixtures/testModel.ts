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
  // strLiteralVal: string ; // StrLiteral;
  // strLiteralArr: string[] ; // StrLiteral[];
  strLiteralVal: StrLiteral;
  strLiteralArr: StrLiteral[];
  dateValue?: Date;
  optionalString?: string;
  // modelsObjectDirect?: {[key: string]: TestSubModel;};
  modelsObjectIndirect?: TestSubModelContainer;
  modelsObjectIndirectNS?: TestSubModelContainerNamespace.TestSubModelContainer;
  modelsObjectIndirectNS2?: TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2;
  modelsObjectIndirectNS_Alias?: TestSubModelContainerNamespace_TestSubModelContainer;
  modelsObjectIndirectNS2_Alias?: TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2;
}

// shortened from StringLiteral to make the tslint enforced
// alphabetical sorting cleaner
export type StrLiteral = 'Foo' | 'Bar';

export interface TestSubModelContainer {
  // [key: string]: TestSubModel2;
  simpleValue: TestSubModel2;
}

export namespace TestSubModelContainerNamespace {
  export interface TestSubModelContainer {
    // [key: string]: TestSubModel2;
    simpleValue: TestSubModel2;
  }

  export namespace InnerNamespace {
    export interface TestSubModelContainer2 {
      // [key: string]: TestSubModel2;
      simpleValue: TestSubModel2;
    }
  }
}
export type TestSubModelContainerNamespace_TestSubModelContainer = TestSubModelContainerNamespace.TestSubModelContainer;
export type TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2 = TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2;

export interface TestSubModel extends Model {
  email: string;
  circular?: TestModel;
}

export interface TestSubModel2 extends TestSubModel {
  testSubModel2: boolean;
}

export interface BooleanResponseModel {
  success: boolean;
}

export interface UserResponseModel {
  id: number;
  name: string;
}

export interface ParameterTestModel {
  firstname: string;
  lastname: string;
  age: number;
  human: boolean;
}

export interface ErrorResponseModel {
  status: number;
  message: string;
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

export interface GenericModel<T> {
  result: T;
}

export interface GenericRequest<T> {
  name: string;
  value: T;
}
