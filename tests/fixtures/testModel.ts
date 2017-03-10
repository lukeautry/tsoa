import { IsInt, IsFloat } from './../../src/decorators/validations';
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

export interface TestSubModel extends Model {
  email: string;
  circular?: TestModel;
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
  @IsInt() public age: number;
  @IsFloat() public weight: number;
  public human: boolean;
  public gender: Gender;
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
