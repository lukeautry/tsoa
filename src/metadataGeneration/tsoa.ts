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
    collectionFormat?: 'csv' | 'multi'| 'pipes' | 'ssv' | 'tsv' ;
  }

  export interface Validators {
    [key: string]: { value?: any, errorMsg?: string };
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

  export interface Type {
    dataType: 'string' | 'double' | 'float' | 'integer' | 'long' | 'enum' | 'array' | 'datetime' | 'date' | 'buffer' | 'void' | 'object' | 'any' | 'refEnum' | 'refObject';
  }

  export interface EnumerateType extends Type {
    dataType: 'enum';
    enums: string[];
  }

  export interface ArrayType extends Type {
    dataType: 'array';
    elementType: Type;
  }

  export interface ReferenceType extends Type {
    description?: string;
    dataType: 'refObject' | 'refEnum';
    refName: string;
    properties?: Property[];
    additionalProperties?: Type;
    enums?: string[];
    example?: any;
  }

  export interface ReferenceTypeMap {
    [refName: string]: Tsoa.ReferenceType;
  }
}
