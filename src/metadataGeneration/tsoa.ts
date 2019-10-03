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
    type: MetaType;
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
    type: MetaType;
    default?: any;
    validators: Validators;
  }

  export interface ArrayParameter extends Parameter {
    type: ArrayMetaType;
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
    schema?: MetaType;
    examples?: any;
  }

  export interface Property {
    default?: any;
    description?: string;
    format?: string;
    name: string;
    type: MetaType;
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
    | 'nestedObjectLiteral'
    | 'union'
    | 'intersection';

  export type RefTypeLiteral = 'refObject' | 'refEnum';

  export type PrimitiveTypeLiteral = Exclude<TypeStringLiteral, RefTypeLiteral | 'enum' | 'array' | 'void' | 'nestedObjectLiteral' | 'union' | 'intersection'>;

  export interface MetaTypeMinimal {
    dataType: TypeStringLiteral;
  }

  export type PrimitiveMetaType = StringMeta | BooleanMeta | DoubleMeta | FloatMeta | IntegerMeta | LongMeta | VoidMeta;

  /**
   * This is one of the possible objects that tsoa creates that helps the code store information about the type it found in the code. So since it's type information about types, that seems pretty meta. Hence, we call it MetaType.
   */
  export type MetaType = PrimitiveMetaType | ObjectNoPropsMeta | EnumMeta | ArrayMetaType | DateTimeMeta | DateMeta | BinaryMeta | BufferMeta | ByteMeta | AnyMetaType | RefEnumMetaType | RefObjectMetaType | NestedObjectMetaType | UnionMetaType | IntersectionMetaType;

  export interface StringMeta extends MetaTypeMinimal {
      dataType: 'string'
  }

  export interface BooleanMeta extends MetaTypeMinimal {
    dataType: 'boolean'
  }

  /**
   * This is the type that occurs when a developer writes `const foo: object = {}` since it can no longer have any properties added to it.
   */
  export interface ObjectNoPropsMeta extends MetaTypeMinimal {
    dataType: 'object'
  }

  export interface DoubleMeta extends MetaTypeMinimal {
    dataType: 'double'
  }

  export interface FloatMeta extends MetaTypeMinimal {
    dataType: 'float'
  }

  export interface IntegerMeta extends MetaTypeMinimal {
    dataType: 'integer'
  }

  export interface LongMeta extends MetaTypeMinimal {
    dataType: 'long'
  }

  export interface EnumMeta extends MetaTypeMinimal {
    dataType: 'enum';
    enums: string[];
  }

  export interface ArrayMetaType extends MetaTypeMinimal {
    dataType: 'array';

    elementType: MetaType;
  }

  export interface DateMeta extends MetaTypeMinimal {
    dataType: 'date'
  }

  export interface DateTimeMeta extends MetaTypeMinimal {
    dataType: 'datetime'
  }

  export interface BinaryMeta extends MetaTypeMinimal {
    dataType: 'binary'
  }

  export interface BufferMeta extends MetaTypeMinimal {
    dataType: 'buffer'
  }

  export interface ByteMeta extends MetaTypeMinimal {
    dataType: 'byte'
  }

  export interface VoidMeta extends MetaTypeMinimal {
    dataType: 'void'
  }

  export interface AnyMetaType extends MetaTypeMinimal {
    dataType: 'any'
  }

  export interface NestedObjectMetaType extends MetaTypeMinimal {
    dataType: 'nestedObjectLiteral';
    properties: Property[];
    additionalProperties?: MetaType;
  }

  export interface RefEnumMetaType extends ReferenceTypeMinimal {
    dataType: 'refEnum';
    enums: string[] | number[];
  }

  export interface RefObjectMetaType extends ReferenceTypeMinimal {
    dataType: 'refObject';
    properties: Property[];
    additionalProperties?: MetaType;
  }

  export type ReferenceType = RefEnumMetaType | RefObjectMetaType;

  export interface ReferenceTypeMinimal extends MetaTypeMinimal {
    description?: string;
    dataType: RefTypeLiteral;
    refName: string;
    example?: any;
  }

  export interface UnionMetaType extends MetaTypeMinimal {
    dataType: 'union';
    types: MetaType[];
  }

  export interface IntersectionMetaType extends MetaTypeMinimal {
    dataType: 'intersection';
    types: MetaType[];
  }

  export interface ReferenceTypeMap {
    [refName: string]: Tsoa.ReferenceType;
  }
}
