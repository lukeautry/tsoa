export namespace Tsoa {
  export interface Metadata {
    controllers: Controller[];
    referenceTypeMap: ReferenceTypeMap;
  }

  export interface Controller {
    location: string;
    methods: Method[];
    name: string;
    path: string;
  }

  export interface Method {
    deprecated?: boolean;
    description?: string;
    method: 'get' | 'post' | 'put' | 'delete' | 'options' | 'head' | 'patch' | 'head';
    name: string;
    parameters: Parameter[];
    path: string;
    type: Type;
    tags?: string[];
    responses: Response[];
    security: Security[];
    summary?: string;
    isHidden: boolean;
    operationId?: string;
  }

  export interface Parameter {
    parameterName: string;
    description?: string;
    in: 'query' | 'header' | 'path' | 'formData' | 'body' | 'body-prop' | 'request';
    name: string;
    required?: boolean;
    type: Type;
    default?: any;
    validators: Validators;
  }

  export interface ArrayParameter extends Parameter {
    type: ArrayType;
    collectionFormat?: 'csv' | 'multi' | 'pipes' | 'ssv' | 'tsv';
  }

  export interface Validators {
    [key: string]: { value?: any; errorMsg?: string };
  }

  export interface Security {
    [key: string]: string[];
  }

  export interface Response {
    description: string;
    name: string;
    schema?: Type;
    examples?: any;
  }

  export interface Property {
    default?: any;
    description?: string;
    format?: string;
    name: string;
    type: Type;
    required: boolean;
    validators: Validators;
  }

  export type TypeStringLiteral =
    | 'string'
    | 'boolean'
    | 'double'
    | 'float'
    | 'integer'
    | 'long'
    | 'enum'
    | 'array'
    | 'datetime'
    | 'date'
    | 'binary'
    | 'buffer'
    | 'byte'
    | 'void'
    | 'object'
    | 'any'
    | 'refEnum'
    | 'refObject'
    | 'refAlias'
    | 'nestedObjectLiteral'
    | 'union'
    | 'intersection';

  export type RefTypeLiteral = 'refObject' | 'refEnum' | 'refAlias';

  export type PrimitiveTypeLiteral = Exclude<TypeStringLiteral, RefTypeLiteral | 'enum' | 'array' | 'void' | 'nestedObjectLiteral' | 'union' | 'intersection'>;

  export interface TypeBase {
    dataType: TypeStringLiteral;
  }

  export type PrimitiveType = StringType | BooleanType | DoubleType | FloatType | IntegerType | LongType | VoidType;

  /**
   * This is one of the possible objects that tsoa creates that helps the code store information about the type it found in the code.
   */
  export type Type =
    | PrimitiveType
    | ObjectsNoPropsType
    | EnumType
    | ArrayType
    | DateTimeType
    | DateType
    | BinaryType
    | BufferType
    | ByteType
    | AnyType
    | RefEnumType
    | RefObjectType
    | RefAliasType
    | NestedObjectLiteralType
    | UnionType
    | IntersectionType;

  export interface StringType extends TypeBase {
    dataType: 'string';
  }

  export interface BooleanType extends TypeBase {
    dataType: 'boolean';
  }

  /**
   * This is the type that occurs when a developer writes `const foo: object = {}` since it can no longer have any properties added to it.
   */
  export interface ObjectsNoPropsType extends TypeBase {
    dataType: 'object';
  }

  export interface DoubleType extends TypeBase {
    dataType: 'double';
  }

  export interface FloatType extends TypeBase {
    dataType: 'float';
  }

  export interface IntegerType extends TypeBase {
    dataType: 'integer';
  }

  export interface LongType extends TypeBase {
    dataType: 'long';
  }

  /**
   * Not to be confused with `RefEnumType` which is a reusable enum which has a $ref name generated for it. This however, is an inline enum.
   */
  export interface EnumType extends TypeBase {
    dataType: 'enum';
    enums: Array<string | number | boolean>;
  }

  export interface ArrayType extends TypeBase {
    dataType: 'array';

    elementType: Type;
  }

  export interface DateType extends TypeBase {
    dataType: 'date';
  }

  export interface DateTimeType extends TypeBase {
    dataType: 'datetime';
  }

  export interface BinaryType extends TypeBase {
    dataType: 'binary';
  }

  export interface BufferType extends TypeBase {
    dataType: 'buffer';
  }

  export interface ByteType extends TypeBase {
    dataType: 'byte';
  }

  export interface VoidType extends TypeBase {
    dataType: 'void';
  }

  export interface AnyType extends TypeBase {
    dataType: 'any';
  }

  export interface NestedObjectLiteralType extends TypeBase {
    dataType: 'nestedObjectLiteral';
    properties: Property[];
    additionalProperties?: Type;
  }

  export interface RefEnumType extends ReferenceTypeBase {
    dataType: 'refEnum';
    enums: Array<string | number>;
  }

  export interface RefObjectType extends ReferenceTypeBase {
    dataType: 'refObject';
    properties: Property[];
    additionalProperties?: Type;
  }

  export interface RefAliasType extends Omit<Property, 'name' | 'required'>, ReferenceTypeBase {
    dataType: 'refAlias';
  }

  export type ReferenceType = RefEnumType | RefObjectType | RefAliasType;

  export interface ReferenceTypeBase extends TypeBase {
    description?: string;
    dataType: RefTypeLiteral;
    refName: string;
    example?: any;
  }

  export interface UnionType extends TypeBase {
    dataType: 'union';
    types: Type[];
  }

  export interface IntersectionType extends TypeBase {
    dataType: 'intersection';
    types: Type[];
  }

  export interface ReferenceTypeMap {
    [refName: string]: Tsoa.ReferenceType;
  }
}
