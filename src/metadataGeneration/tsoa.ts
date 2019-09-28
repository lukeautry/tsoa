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
    | 'refType'
    | 'nestedObjectLiteral'
    | 'union'
    | 'intersection';

  export type RefTypeLiteral = 'refObject' | 'refEnum' | 'refType';

  export type PrimitiveTypeLiteral = Exclude<TypeStringLiteral, RefTypeLiteral | 'enum' | 'array' | 'void' | 'nestedObjectLiteral' | 'union' | 'intersection'>;

  export interface Type {
    dataType: TypeStringLiteral;
  }

  export interface RefTypeMinimal {
    dataType: RefTypeLiteral;
  }

  export interface EnumerateType extends Type {
    dataType: 'enum';
    enums: string[];
  }

  export interface ObjectLiteralType extends Type {
    dataType: 'nestedObjectLiteral';
    properties: Property[];
    additionalProperties?: Type;
  }

  export interface ArrayType extends Type {
    dataType: 'array';
    elementType: Type;
  }

  export interface ReferenceTypeBase extends Type, RefTypeMinimal {
    description?: string;
    dataType: RefTypeLiteral;
    refName: string;
    example?: any;
  }

  export type ReferenceType = ReferenceObject | ReferenceEnum | ReferenceTypeAlias;

  export interface ReferenceObject extends ReferenceTypeBase {
    dataType: 'refObject';
    properties: Property[];
    additionalProperties?: Type;
  }

  export interface ReferenceEnum extends ReferenceTypeBase {
    dataType: 'refEnum';
    enums: string[];
  }

  export interface ReferenceTypeAlias extends Omit<Property, 'name' | 'required'>, ReferenceTypeBase {
    dataType: 'refType';
  }

  export interface UnionType extends Type {
    dataType: 'union';
    types: Type[];
  }

  export interface IntersectionType extends Type {
    dataType: 'intersection';
    types: Type[];
  }

  export interface ReferenceTypeMap {
    [refName: string]: Tsoa.ReferenceType;
  }
}
