/**
 * This is a description of a model
 * @tsoaModel
 */
export interface TestModel extends Model {
  /**
   * This is a description of this model property, numberValue
   */
  numberValue: number;
  numberArray: number[];
  /**
   * @format password
   */
  stringValue: string;
  stringArray: string[];
  boolValue: boolean;
  boolArray: boolean[];
  enumValue?: EnumIndexValue;
  enumArray?: EnumIndexValue[];
  enumNumberValue?: EnumNumberValue;
  enumNumberArray?: EnumNumberValue[];
  enumStringValue?: EnumStringValue;
  enumStringArray?: EnumStringValue[];
  modelValue: TestSubModel;
  modelsArray: TestSubModel[];
  strLiteralVal: StrLiteral;
  strLiteralArr: StrLiteral[];
  unionPrimetiveType?: 'String' | 1 | 20.0 | true | false;
  dateValue?: Date;
  optionalString?: string;
  anyType?: any;
  // modelsObjectDirect?: {[key: string]: TestSubModel2;};
  modelsObjectIndirect?: TestSubModelContainer;
  modelsObjectIndirectNS?: TestSubModelContainerNamespace.TestSubModelContainer;
  modelsObjectIndirectNS2?: TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2;
  modelsObjectIndirectNS_Alias?: TestSubModelContainerNamespace_TestSubModelContainer;
  modelsObjectIndirectNS2_Alias?: TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2;

  modelsArrayIndirect?: TestSubArrayModelContainer;
  modelsEnumIndirect?: TestSubEnumModelContainer;
  typeAliasCase1?: TypeAliasModelCase1;
  TypeAliasCase2?: TypeAliasModelCase2;
}

export interface TypeAliasModel1 {
  value1: string;
}

export interface TypeAliasModel2 {
  value2: string;
}

export class TypeAliasModel3 {
  public value3: string;
}

export type TypeAliasModelCase1 = TypeAliasModel1 & TypeAliasModel2;

export type TypeAliasModelCase2 = TypeAliasModelCase1 & TypeAliasModel3;

/**
 * EnumIndexValue.
 */
export enum EnumIndexValue {
  VALUE_1, VALUE_2,
}

/**
 * EnumNumberValue.
 */
export enum EnumNumberValue {
  VALUE_1 = 2, VALUE_2 = 5,
}

/**
 * EnumStringValue.
 */
export enum EnumStringValue {
  VALUE_1 = 'VALUE_1' as any, VALUE_2 = 'VALUE_2' as any,
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
   * @isInt invalid integer number
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
   * @isDate invalid ISO 8601 date format, i.e. YYYY-MM-DD
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

  /**
   * @ignore
   */
  public ignoredProperty: string;
}

/**
 * Gender msg
 */
export enum Gender {
   MALE = 'MALE' as any,
   FEMALE = 'FEMALE' as any,
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
  public defaultValue1 = 'Default Value 1';
}

// bug #158
export class Account {
  public id: number;
}

/**
 * This is a description of TestClassModel
 */
export class TestClassModel extends TestClassBaseModel {
  public account: Account;
  public defaultValue2 = 'Default Value 2';
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
  /**
   * @format email
   * @pattern ^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$
   */
  public emailPattern?: string;
  /* tslint:disable-next-line */
  stringProperty: string;
  protected protectedStringProperty: string;

  public static typeLiterals = {
    booleanTypeLiteral: { $type: Boolean },
    numberTypeLiteral: { $type: Number },
    stringTypeLiteral: { $type: String },
  };

  /**
   * @param publicConstructorVar This is a description for publicConstructorVar
   */
  constructor(
    public publicConstructorVar: string,
    protected protectedConstructorVar: string,
    public optionalPublicConstructorVar?: string,
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
