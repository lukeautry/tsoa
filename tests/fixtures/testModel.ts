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
  enumValue?: EnumNumberValue;
  enumArray?: EnumNumberValue[];
  enumStringValue?: EnumStringValue;
  enumStringArray?: EnumStringValue[];
  modelValue: TestSubModel;
  modelsArray: TestSubModel[];
  strLiteralVal: StrLiteral;
  strLiteralArr: StrLiteral[];
  dateValue?: Date;
  optionalString?: string;
  // modelsObjectDirect?: {[key: string]: TestSubModel2;};
  modelsObjectIndirect?: TestSubModelContainer;
  modelsObjectIndirectNS?: TestSubModelContainerNamespace.TestSubModelContainer;
  modelsObjectIndirectNS2?: TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2;
  modelsObjectIndirectNS_Alias?: TestSubModelContainerNamespace_TestSubModelContainer;
  modelsObjectIndirectNS2_Alias?: TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2;

  modelsArrayIndirect?: TestSubArrayModelContainer;
  modelsEnumIndirect?: TestSubEnumModelContainer;
}

export enum EnumNumberValue {
  VALUE_1, VALUE_2
}

export enum EnumStringValue {
  VALUE_1 = <any>'VALUE_1', VALUE_2 = <any>'VALUE_2'
}

// shortened from StringLiteral to make the tslint enforced
// alphabetical sorting cleaner
export type StrLiteral = 'Foo' | 'Bar';

export interface TestSubModelContainer {
  [key: string]: TestSubModel2;
}

export interface TestSubArrayModelContainer {
  [key: string]: TestSubModel2[];
}

export interface TestSubEnumModelContainer {
  [key: string]: EnumStringValue;
}

export namespace TestSubModelContainerNamespace {
  export interface TestSubModelContainer {
    [key: string]: TestSubModelNamespace.TestSubModelNS;
  }

  export namespace InnerNamespace {
    export interface TestSubModelContainer2 {
      [key: string]: TestSubModelNamespace.TestSubModelNS;
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

export namespace TestSubModelNamespace {
  export interface TestSubModelNS extends TestSubModel {
    testSubModelNS: boolean;
  }
}

export interface BooleanResponseModel {
  success: boolean;
}

export interface UserResponseModel {
  id: number;
  name: string;
}

export class ParameterTestModel {
  public firstname: string;
  public lastname: string;
  /**
   * @isInt
   * @minimum 1
   * @maximum 100
   */
  public age: number;
  /**
   * @isFloat
   */
  public weight: number;
  public human: boolean;
  public gender: Gender;
}

export class ValidateCustomErrorModel {

}

export class ValidateModel {
  /**
   * @isFloat Invalid float error message.
   */
  public floatValue: number;
  /**
   * @isDouble Invalid double error message.
   */
  public doubleValue: number;
  /**
   * @isInt
   */
  public intValue: number;
  /**
   * @isLong Custom Required long number.
   */
  public longValue: number;
  /**
   * @isBoolean
   */
  public booleanValue: boolean;
  /**
   * @isArray
   */
  public arrayValue: number[];
  /**
   * @isDate
   */
  public dateValue: Date;
  /**
   * @isDateTime
   */
  public datetimeValue: Date;

  /**
   * @maximum 10
   */
  public numberMax10: number;
  /**
   * @minimum 5
   */
  public numberMin5: number;
  /**
   * @maxLength 10
   */
  public stringMax10Lenght: string;
  /**
   * @minLength 5
   */
  public stringMin5Lenght: string;
  /**
   *  @pattern ^[a-zA-Z]+$
   */
  public stringPatternAZaz: string;

  /**
   * @maxItems 5
   */
  public arrayMax5Item: number[];
  /**
   * @minItems 2
   */
  public arrayMin2Item: number[];
  /**
   * @uniqueItems
   */
  public arrayUniqueItem: number[];
}

export enum Gender {
  MALE = <any>'MALE', FEMALE = <any>'FEMALE'
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
  *
  * @minLength 3
  * @maxLength 20
  * @pattern ^[a-zA-Z]+$
  */
  public publicStringProperty: string;
  /**
   * @minLength 0
   * @maxLength 10
   */
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
