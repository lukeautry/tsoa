import { Deprecated, Example, Extension } from '@tsoa/runtime';

/**
 * This is a description of a model
 * @tsoaModel
 * @example
 * {
 *   "boolArray": [true, false],
 *   "boolValue": true,
 *   "dateValue": "2018-06-25T15:45:00Z",
 *   "id": 2,
 *   "modelValue": {
 *     "id": 3,
 *     "email": "test(at)example.com"
 *   },
 *   "modelsArray": [],
 *   "numberArray": [1, 2, 3],
 *   "numberArrayReadonly": [1, 2, 3],
 *   "numberValue": 1,
 *   "optionalString": "optional string",
 *   "strLiteralArr": ["Foo", "Bar"],
 *   "strLiteralVal": "Foo",
 *   "stringArray": ["string one", "string two"],
 *   "stringValue": "a string"
 * }
 * @example
 * {
 *   "stringValue": "(example2)a string"
 * }
 */
export interface TestModel extends Model {
  and: TypeAliasModel1 & TypeAliasModel2;
  /**
   * This is a description of this model property, numberValue
   */
  numberValue: number;
  numberArray: number[];
  readonly numberArrayReadonly: readonly number[];
  /**
   * @example "letmein"
   * @example "letmein(example)2"
   * @format password
   */
  stringValue: string;
  stringArray: string[];
  /**
   * @default true
   */
  boolValue: boolean;
  boolArray: boolean[];
  object: object;
  objectArray: object[];
  undefinedValue: undefined;
  enumValue?: EnumIndexValue;
  enumArray?: EnumIndexValue[];
  enumNumberValue?: EnumNumberValue;
  enumStringNumberValue?: EnumStringNumberValue;
  enumStringNumberArray?: EnumStringNumberValue[];
  enumNumberArray?: EnumNumberValue[];
  enumStringValue?: EnumStringValue;
  enumStringProperty?: EnumStringValue.VALUE_1;
  enumStringArray?: EnumStringValue[];
  modelValue: TestSubModel;
  modelsArray: TestSubModel[];
  strLiteralVal: StrLiteral;
  strLiteralArr: StrLiteral[];
  unionPrimitiveType?: 'String' | 1 | 20.0 | true | false;
  nullableUnionPrimitiveType?: 'String' | 1 | 20.0 | true | false | null;
  undefineableUnionPrimitiveType: 'String' | 1 | 20.0 | true | false | undefined;
  singleFloatLiteralType?: 3.1415;
  dateValue?: Date;
  optionalString?: string;
  anyType?: any;
  unknownType?: unknown;
  genericTypeObject?: Generic<{ foo: string; bar: boolean }>;
  indexed?: Partial<Indexed['foo']>;
  indexedValue?: IndexedValue;
  parenthesizedIndexedValue?: ParenthesizedIndexedValue;
  indexedValueReference?: IndexedValueReference;
  indexedValueGeneric?: IndexedValueGeneric<IndexedValueTypeReference>;
  record?: Record<'record-foo' | 'record-bar', { data: string }>;
  // modelsObjectDirect?: {[key: string]: TestSubModel2;};
  modelsObjectIndirect?: TestSubModelContainer;
  modelsObjectIndirectNS?: TestSubModelContainerNamespace.TestSubModelContainer;
  modelsObjectIndirectNS2?: TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2;
  modelsObjectIndirectNS_Alias?: TestSubModelContainerNamespace_TestSubModelContainer;
  modelsObjectIndirectNS2_Alias?: TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2;

  modelsArrayIndirect?: TestSubArrayModelContainer;
  modelsEnumIndirect?: TestSubEnumModelContainer;
  or: TypeAliasModel1 | TypeAliasModel2;
  referenceAnd: TypeAliasModelCase1;
  typeAliasCase1?: TypeAliasModelCase1;
  TypeAliasCase2?: TypeAliasModelCase2;

  typeAliases?: {
    word: Word;
    fourtyTwo: FourtyTwo;
    dateAlias?: DateAlias;
    unionAlias: UnionAlias;
    intersectionAlias: IntersectionAlias;
    nOLAlias: NolAlias;
    genericAlias: GenericAlias<string>;
    genericAlias2: GenericAlias<Model>;
    forwardGenericAlias: ForwardGenericAlias<boolean, TypeAliasModel1>;
  };

  advancedTypeAliases?: {
    omit?: Omit<ErrorResponseModel, 'status'>;
    omitHidden?: Omit<PrivateModel, 'stringPropDec1'>;
    partial?: Partial<Account>;
    excludeToEnum?: Exclude<EnumUnion, EnumNumberValue>;
    excludeToAlias?: Exclude<ThreeOrFour, TypeAliasModel3>;
    // prettier-ignore
    excludeLiteral?: Exclude<keyof TestClassModel, 'account' | "defaultValue2" | "indexedTypeToInterface" | 'indexedTypeToClass' | 'indexedTypeToAlias' | 'indexedResponseObject' | 'arrayUnion' | 'objectUnion'>;
    excludeToInterface?: Exclude<OneOrTwo, TypeAliasModel1>;
    excludeTypeToPrimitive?: NonNullable<number | null>;

    pick?: Pick<ThingContainerWithTitle<string>, 'list'>;

    readonlyClass?: Readonly<TestClassModel>;

    defaultArgs?: DefaultTestModel;
    heritageCheck?: HeritageTestModel;
    heritageCheck2?: HeritageTestModel2;
  };

  genericMultiNested?: GenericRequest<GenericRequest<TypeAliasModel1>>;
  // eslint-disable-next-line @typescript-eslint/array-type
  genericNestedArrayKeyword1?: GenericRequest<Array<TypeAliasModel1>>;
  genericNestedArrayCharacter1?: GenericRequest<TypeAliasModel1[]>;
  // eslint-disable-next-line @typescript-eslint/array-type
  genericNestedArrayKeyword2?: GenericRequest<Array<TypeAliasModel2>>;
  genericNestedArrayCharacter2?: GenericRequest<TypeAliasModel2[]>;
  mixedUnion?: string | TypeAliasModel1;

  objLiteral: {
    name: string;
    nested?: {
      bool: boolean;
      optional?: number;
      allNestedOptional: {
        one?: string;
        two?: string;
      };
      additionals?: {
        [name: string]: TypeAliasModel1;
      };
    };
    /** @deprecated */
    deprecatedSubProperty?: number;
  };

  /** not deprecated */
  notDeprecatedProperty?: number;
  /** although the properties won't be explicity deprecated in the spec, they'll be implicitly deprecated due to the ref pulling it in */
  propertyOfDeprecatedType?: DeprecatedType;
  propertyOfDeprecatedClass?: DeprecatedClass;
  /** @deprecated */
  deprecatedProperty?: number;
  deprecatedFieldsOnInlineMappedTypeFromSignature?: {
    [K in keyof TypeWithDeprecatedProperty as `${K}Prop`]: boolean;
  };
  deprecatedFieldsOnInlineMappedTypeFromDeclaration?: {
    [K in keyof ClassWithDeprecatedProperty as `${K}Prop`]: boolean;
  };
  notDeprecatedFieldsOnInlineMappedTypeWithIndirection?: {
    [K in Exclude<keyof TypeWithDeprecatedProperty, 'ok'>]: boolean;
  };

  defaultGenericModel?: GenericModel;

  // prettier-ignore
  stringAndBoolArray?: Array<(string | boolean)>;

  /**
   * @example {
   *   "numberOrNull": null,
   *   "wordOrNull": null,
   *   "maybeString": null,
   *   "justNull": null
   * }
   */
  nullableTypes?: {
    /**
     * @isInt
     * @minimum 5
     */
    numberOrNull: number | null;
    wordOrNull: Maybe<Word>;
    maybeString: Maybe<string>;
    justNull: null;
  };

  templateLiteralString?: TemplateLiteralString;
  inlineTLS?: `${Uppercase<OrderDirection>}`;
  inlineMappedType?: { [K in Exclude<TemplateLiteralString, 'firstname:asc'>]: boolean };
  inlineMappedTypeRemapped?: {
    [K in keyof ParameterTestModel as `${Capitalize<K>}Prop`]?: string;
  };

  /**
   * @extension {"x-key-1": "value-1"}
   * @extension {"x-key-2": "value-2"}
   */
  extensionComment?: boolean;

  keyofLiteral?: keyof Items;
}

type Items = {
  type1: unknown;
  type2: unknown;
};

/** @deprecated */
interface DeprecatedType {
  value: string;
}

@Deprecated()
class DeprecatedClass {}

interface TypeWithDeprecatedProperty {
  ok: boolean;
  /** @deprecated */
  notOk?: boolean;
}

class ClassWithDeprecatedProperty {
  ok!: boolean;
  @Deprecated()
  notOk?: boolean;
  /** @deprecated */
  stillNotOk?: boolean;
}

interface Generic<T> {
  foo: T;
}

interface Indexed {
  foo: {
    bar: string;
  };
}

const indexedValue = {
  foo: 'FOO',
  bar: 'BAR',
} as const;
export type IndexedValueTypeReference = typeof indexedValue;

export type IndexedValue = typeof indexedValue[keyof typeof indexedValue];

// prettier-ignore
export type ParenthesizedIndexedValue = (typeof indexedValue)[keyof typeof indexedValue];

export type IndexedValueReference = IndexedValueTypeReference[keyof IndexedValueTypeReference];

export type IndexedValueGeneric<Value> = Value[keyof Value];

const otherIndexedValue = {
  foo: 'fOO',
} as const;

export type ForeignIndexedValue = typeof indexedValue[keyof typeof otherIndexedValue];

type Maybe<T> = T | null;

export interface TypeAliasModel1 {
  value1: string;
}

export interface TypeAliasModel2 {
  value2: string;
}

export class TypeAliasModel3 {
  public value3!: string;
}

export type TypeAlias4 = { value4: string };

export type TypeAliasDateTime = {
  /**
   * @isDateTime
   */
  dateTimeValue: Date;
};

export type TypeAliasDate = {
  /**
   * @isDate
   */
  dateValue: Date;
};

export type TypeAliasModelCase1 = TypeAliasModel1 & TypeAliasModel2;

export type TypeAliasModelCase2 = TypeAliasModelCase1 & TypeAliasModel3;

type UnionAndIntersectionAlias = OneOrTwo & ThreeOrFour;
type OneOrTwo = TypeAliasModel1 | TypeAliasModel2;
type ThreeOrFour = TypeAliasModel3 | TypeAlias4;

/**
 * A Word shall be a non-empty sting
 * @minLength 1
 * @format password
 */
type Word = string;

/**
 * The number 42 expressed through OpenAPI
 * @isInt
 * @default 42
 * @minimum 42
 * @maximum 42
 * @example 42
 */
type FourtyTwo = number;

/**
 * @isDate invalid ISO 8601 date format, i.e. YYYY-MM-DD
 */
type DateAlias = Date;

type UnionAlias = TypeAliasModelCase2 | TypeAliasModel2;
type IntersectionAlias = { value1: string; value2: string } & TypeAliasModel1;
/* tslint:disable-next-line */
type NolAlias = { value1: string; value2: string };
type GenericAlias<T> = T;
type ForwardGenericAlias<T, U> = GenericAlias<U> | T;

type EnumUnion = EnumIndexValue | EnumNumberValue;

/**
 * EnumIndexValue.
 */
export enum EnumIndexValue {
  VALUE_1,
  VALUE_2,
}

/**
 * EnumNumberValue.
 */
export enum EnumNumberValue {
  VALUE_0 = 0,
  VALUE_1 = 2,
  VALUE_2 = 5,
}

/**
 * EnumStringNumberValue.
 * @tsoaModel
 */
export enum EnumStringNumberValue {
  VALUE_0 = '0',
  VALUE_1 = '2',
  VALUE_2 = '5',
}

/**
 * EnumStringValue.
 */
export enum EnumStringValue {
  EMPTY = '',
  VALUE_1 = 'VALUE_1',
  VALUE_2 = 'VALUE_2',
}

// shortened from StringLiteral to make the tslint enforced
// alphabetical sorting cleaner
export type StrLiteral = '' | 'Foo' | 'Bar';

export interface TestSubModelContainer {
  [key: string]: TestSubModel2;
}

export interface TestSubArrayModelContainer {
  [key: string]: TestSubModel2[];
}

export interface TestSubEnumModelContainer {
  [key: string]: EnumStringValue;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TestSubModelContainerNamespace {
  export interface TestSubModelContainer {
    [key: string]: TestSubModelNamespace.TestSubModelNS;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
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

export interface HeritageTestModel extends TypeAlias4, Partial<Omit<UserResponseModel, 'id'>> {}

export interface HeritageBaseModel {
  value: string;
}

export type HeritageTestModel2 = HeritageBaseModel

export interface DefaultTestModel<T = Word, U = Omit<ErrorResponseModel, 'status'>> {
  t: GenericRequest<T>;
  u: DefaultArgs<U>;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TestSubModelNamespace {
  export interface TestSubModelNS extends TestSubModel {
    testSubModelNS: boolean;
  }
}

export interface BooleanResponseModel {
  success: boolean;
}

export interface TruncationTestModel {
  demo01: string;
  demo02: string;
  demo03: string;
  demo04: string;
  demo05: string;
  demo06: string;
  demo07: string;
  demo08: string;
  demo09: string;
  demo10: string;
  demo11: string;
  demo12: string;
  demo13: string;
  demo14: string;
  demo15: string;
  demo16: string;
  demo17: string;
  d?: string;
}

export interface UserResponseModel {
  id: number;
  name: string;
}

export class ParameterTestModel {
  public firstname!: string;
  public lastname!: string;
  /**
   * @isInt
   * @minimum 1
   * @maximum 100
   */
  public age!: number;
  /**
   * @isFloat
   */
  public weight!: number;
  public human!: boolean;
  public gender!: Gender;
  public nicknames?: string[];
}

export class ValidateCustomErrorModel {}

export class ValidateModel {
  /**
   * @isFloat Invalid float error message.
   */
  public floatValue!: number;
  /**
   * @isDouble Invalid double error message.
   */
  public doubleValue!: number;
  /**
   * @isInt invalid integer number
   */
  public intValue!: number;
  /**
   * @isLong Custom Required long number.
   */
  public longValue!: number;
  /**
   * @isBoolean
   */
  public booleanValue!: boolean;
  /**
   * @isArray
   */
  public arrayValue!: number[];
  /**
   * @isDate invalid ISO 8601 date format, i.e. YYYY-MM-DD
   */
  public dateValue!: Date;
  /**
   * @isDateTime
   */
  public datetimeValue!: Date;

  /**
   * @maximum 10
   */
  public numberMax10!: number;
  /**
   * @minimum 5
   */
  public numberMin5!: number;
  /**
   * @maxLength 10
   */
  public stringMax10Lenght!: string;
  /**
   * @minLength 5
   */
  public stringMin5Lenght!: string;
  /**
   *  @pattern ^[a-zA-Z]+$
   */
  public stringPatternAZaz!: string;
  /**
   * @pattern `^([A-Z])(?!@)$`
   */
  public quotedStringPatternA!: string;
  /**
   * @maxItems 5
   */
  public arrayMax5Item!: number[];
  /**
   * @minItems 2
   */
  public arrayMin2Item!: number[];
  /**
   * @uniqueItems
   */
  public arrayUniqueItem!: number[];

  /**
   * @ignore
   */
  public ignoredProperty!: string;

  public model!: TypeAliasModel1;
  public intersection?: TypeAliasModel1 & TypeAliasModel2;
  public intersectionNoAdditional?: TypeAliasModel1 & TypeAliasModel2;
  public mixedUnion?: string | TypeAliasModel1;
  public singleBooleanEnum?: true;

  public typeAliases?: {
    word: Word;
    fourtyTwo: FourtyTwo;
    unionAlias: UnionAlias;
    intersectionAlias: IntersectionAlias;
    intersectionAlias2?: TypeAliasModelCase2;
    unionIntersectionAlias1?: UnionAndIntersectionAlias;
    unionIntersectionAlias2?: UnionAndIntersectionAlias;
    unionIntersectionAlias3?: UnionAndIntersectionAlias;
    unionIntersectionAlias4?: UnionAndIntersectionAlias;
    nOLAlias: NolAlias;
    genericAlias: GenericAlias<string>;
    genericAlias2: GenericAlias<Model>;
    forwardGenericAlias: ForwardGenericAlias<boolean, TypeAliasModel1>;
  };

  public nullableTypes!: {
    /**
     * @isInt
     * @minimum 5
     */
    numberOrNull: number | null;
    wordOrNull: Maybe<Word>;
    maybeString: Maybe<string>;
    justNull: null;
  };

  public nestedObject!: {
    /**
     * @isFloat Invalid float error message.
     */
    floatValue: number;
    /**
     * @isDouble Invalid double error message.
     */
    doubleValue: number;
    /**
     * @isInt invalid integer number
     */
    intValue: number;
    /**
     * @isLong Custom Required long number.
     */
    longValue: number;
    /**
     * @isBoolean
     */
    booleanValue: boolean;
    /**
     * @isArray
     */
    arrayValue: number[];
    /**
     * @isDate invalid ISO 8601 date format, i.e. YYYY-MM-DD
     */
    dateValue: Date;
    /**
     * @isDateTime
     */
    datetimeValue: Date;

    /**
     * @maximum 10
     */
    numberMax10: number;
    /**
     * @minimum 5
     */
    numberMin5: number;
    /**
     * @maxLength 10
     */
    stringMax10Lenght: string;
    /**
     * @minLength 5
     */
    stringMin5Lenght: string;
    /**
     *  @pattern ^[a-zA-Z]+$
     */
    stringPatternAZaz: string;
    /**
     * @pattern `^([A-Z])(?!@)$`
     */
    quotedStringPatternA: string;
    /**
     * @maxItems 5
     */
    arrayMax5Item: number[];
    /**
     * @minItems 2
     */
    arrayMin2Item: number[];
    /**
     * @uniqueItems
     */
    arrayUniqueItem: number[];

    model: TypeAliasModel1;
    intersection?: TypeAliasModel1 & TypeAliasModel2;
    intersectionNoAdditional?: TypeAliasModel1 & TypeAliasModel2;
    mixedUnion?: string | TypeAliasModel1;
  };
}

export interface ValidateMapStringToNumber {
  [key: string]: number;
}

export interface ValidateMapStringToAny {
  [key: string]: any;
}

/**
 * Gender msg
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export interface ErrorResponseModel {
  status: number;

  /**
   * @minLength 2
   */
  message: string;

  /**
   * @ignore
   */
  hidden?: string;
}

export interface Model {
  id: number;
}

export class TestClassBaseModel {
  public id!: number;
  public defaultValue1 = 'Default Value 1';
}

// bug #158
export class Account {
  public id!: number;
}

export class PrivateModel {
  public stringPropDec1!: string;

  /**
   * @minLength 2
   */
  public stringPropDec2!: string;

  /**
   * @ignore
   */
  public stringPropDec3!: string;

  private hidden!: string;

  constructor(public id: number, arg: boolean, private privArg: boolean) {
    this.hidden && this.privArg ? '' : '';
  }
}

enum MyEnum {
  OK,
  KO,
}

interface IndexedInterface {
  foo: 'bar';
}
type IndexedInterfaceAlias = IndexedInterface;
class IndexedClass {
  public foo!: 'bar';
}

interface Indexed {
  foo: {
    bar: string;
  };
  interface: IndexedInterface;
  alias: IndexedInterfaceAlias;
  class: IndexedClass;
}
type IndexType = 'foo';
const fixedArray = ['foo', 'bar'] as const;

const ClassIndexTest = {
  foo: ['id'],
} as const;
type Names = keyof typeof ClassIndexTest;
type ResponseDistribute<T, U> = T extends Names
  ? {
      [key in T]: Record<typeof ClassIndexTest[T][number], U>;
    }
  : never;
type IndexRecordAlias<T> = ResponseDistribute<Names, T>;

/**
 * This is a description of TestClassModel
 */
export class TestClassModel extends TestClassBaseModel {
  public account!: Account;
  public defaultValue2 = 'Default Value 2';
  public enumKeys!: keyof typeof MyEnum;
  public keyInterface?: keyof Model;
  public indexedType?: Indexed[IndexType]['bar'];
  public indexedTypeToInterface?: Indexed['interface'];
  public indexedTypeToClass?: Indexed['class'];
  public indexedTypeToAlias?: Indexed['alias'];
  public indexedResponse?: IndexRecordAlias<string>['foo'];
  public indexedResponseObject?: IndexRecordAlias<{ myProp1: string }>['foo'];
  public arrayUnion?: typeof fixedArray[number];
  public objectUnion?: Record<string, 'foo' | 'bar'>[string];
  /**
   * This is a description of a public string property
   *
   * @minLength 3
   * @maxLength 20
   * @pattern ^[a-zA-Z]+$
   * @example "classPropExample"
   */
  public publicStringProperty!: string;
  /**
   * @minLength 0
   * @maxLength 10
   */
  public optionalPublicStringProperty?: string;
  /**
   * @format email
   * @pattern `^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$`
   */
  public emailPattern?: string;
  stringProperty!: string;
  protected protectedStringProperty!: string;
  public static staticStringProperty: string;
  @Deprecated()
  public deprecated1?: boolean;
  /** @deprecated */
  public deprecated2?: boolean;
  @Extension('x-key-1', 'value-1')
  @Extension('x-key-2', 'value-2')
  public extensionTest?: boolean;
  /**
   * @extension {"x-key-1": "value-1"}
   * @extension {"x-key-2": "value-2"}
   */
  public extensionComment?: boolean;
  @Example('stringValue')
  public stringExample?: string;
  @Example({
    id: 1,
    label: 'labelValue',
  })
  public objectExample?: {
    id: number;
    label: string;
  };

  /**
   * @param publicConstructorVar This is a description for publicConstructorVar
   */
  constructor(
    public publicConstructorVar: string,
    protected protectedConstructorVar: string,
    defaultConstructorArgument: string,
    readonly readonlyConstructorArgument: string,
    public optionalPublicConstructorVar?: string,
    @Deprecated() public deprecatedPublicConstructorVar?: boolean,
    /** @deprecated */ public deprecatedPublicConstructorVar2?: boolean,
    @Deprecated() deprecatedNonPublicConstructorVar?: boolean,
  ) {
    super();
  }

  public myIgnoredMethod() {
    return 'ignored';
  }
}

type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;
export class GetterClass {
  public a!: 'b';

  get foo() {
    return 'bar';
  }

  public toJSON(): NonFunctionProperties<GetterClass> & { foo: string } {
    return Object.assign({}, this, { foo: this.foo });
  }
}

export class SimpleClassWithToJSON {
  public a: string;
  public b: boolean;

  constructor(a: string, b: boolean) {
    this.a = a;
    this.b = b;
  }

  public toJSON(): { a: string } {
    return { a: this.a };
  }
}

export interface GetterInterface {
  toJSON(): { foo: string };
}

export interface GetterInterfaceHerited extends GetterInterface {
  foo: number;
}

export interface GenericModel<T = string> {
  result: T;
  union?: T | string;
  nested?: GenericRequest<T>;
  heritageCheck?: ThingContainerWithTitle<T>;
}
export interface DefaultArgs<T = Word> {
  name: T;
}

export interface GenericRequest<T> {
  name: string;
  value: T;
}

interface ThingContainerWithTitle<T> extends GenericContainer<number, number> {
  // T is TestModel[] here
  t: T;
  title: string;
}

interface GenericContainer<T, TSameNameDifferentValue> {
  id: string;
  // T is number here
  list: T[];
  dangling: DanglingContext<T>;
}

/**
 * This should only be used inside GenericContainer to check its
 * type argument T gets propagated while TSameNameDifferentValue does not
 * and instead, the interface {@link TSameNameDifferentValue} is used.
 */
interface DanglingContext<T> {
  number: T;
  shouldBeString: TSameNameDifferentValue;
}

interface TSameNameDifferentValue {
  str: string;
}

type OrderDirection = 'asc' | 'desc';

type OrderOptions<E> = `${keyof E & string}:${OrderDirection}`;

type TemplateLiteralString = OrderOptions<ParameterTestModel>;
