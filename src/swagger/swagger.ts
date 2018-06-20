export namespace Swagger {
  export type DataType = 'integer'
    | 'number'
    | 'boolean'
    | 'string'
    | 'array'
    | 'object'
    ;

  export type DataFormat = 'int32'
    | 'int64'
    | 'float'
    | 'double'
    | 'byte'
    | 'binary'
    | 'date'
    | 'date-time'
    | 'password';
  export type Protocol = 'http'
    | 'https'
    | 'ws'
    | 'wss';

  export interface Spec {
    swagger: '2.0';
    info: Info;
    host?: string;
    basePath?: string;
    schemes?: Protocol[];
    consumes?: string[];
    produces?: string[];
    paths: { [name: string]: Path };
    definitions?: { [name: string]: Schema };
    parameters?: { [name: string]: Parameter };
    responses?: { [name: string]: Response };
    security?: Security[];
    securityDefinitions?: { [name: string]: Security };
    tags?: Tag[];
    externalDocs?: ExternalDocs;
  }

  export interface Info {
    title: string;
    version?: string;
    description?: string;
    termsOfService?: string;
    contact?: Contact;
    license?: License;
  }

  export interface Contact {
    name?: string;
    email?: string;
    url?: string;
  }

  export interface License {
    name: string;
    url?: string;
  }

  export interface ExternalDocs {
    url: string;
    description?: string;
  }

  export interface Tag {
    name: string;
    description?: string;
    externalDocs?: ExternalDocs;
  }

  export interface Example {
    [name: string]: any;
  }

  export interface BaseParameter extends BaseSchema {
    name: string;
    in: 'query' | 'header' | 'path' | 'formData' | 'body';
    required?: boolean;
    description?: string;
    schema: Schema;
    type: DataType;
    format?: DataFormat;
  }

  export interface BodyParameter extends BaseParameter {
    in: 'body';
  }

  export interface QueryParameter extends BaseParameter {
    in: 'query';
    allowEmptyValue?: boolean;
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
  }

  export interface PathParameter extends BaseParameter {
    in: 'path';
  }

  export interface HeaderParameter extends BaseParameter {
    in: 'header';
  }

  export interface FormDataParameter extends BaseParameter {
    in: 'formData';
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
  }

  export type Parameter = BodyParameter
    | FormDataParameter
    | QueryParameter
    | PathParameter
    | HeaderParameter;

  export interface Path {
    $ref?: string;
    get?: Operation;
    put?: Operation;
    post?: Operation;
    delete?: Operation;
    options?: Operation;
    head?: Operation;
    patch?: Operation;
    parameters?: Parameter[];
  }

  export interface Operation {
    tags?: string[];
    summary?: string;
    description?: string;
    externalDocs?: ExternalDocs;
    operationId: string;
    consumes?: string[];
    produces?: string[];
    parameters?: Parameter[];
    responses: { [name: string]: Response };
    schemes?: Protocol[];
    deprecated?: boolean;
    security?: Security[];
  }

  export interface Response {
    description: string;
    schema?: Schema;
    headers?: { [name: string]: Header };
    examples?: { [name: string]: Example };
  }

  export interface BaseSchema {
    type?: string;
    format?: string;
    $ref?: string;
    title?: string;
    description?: string;
    default?: string | boolean | number | any;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimum?: number;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxProperties?: number;
    minProperties?: number;
    enum?: string[];
    items?: BaseSchema;
  }

  export interface Schema extends BaseSchema {
    type: DataType;
    format?: DataFormat;
    allOf?: Schema[];
    additionalProperties?: boolean | BaseSchema;
    properties?: { [propertyName: string]: Schema };
    discriminator?: string;
    readOnly?: boolean;
    xml?: XML;
    externalDocs?: ExternalDocs;
    example?: { [exampleName: string]: Example };
    required?: string[];
  }

  export interface Header extends BaseSchema {
    type: 'integer' | 'number' | 'boolean' | 'string' | 'array';
  }

  export interface XML {
    type?: string;
    namespace?: string;
    prefix?: string;
    attribute?: string;
    wrapped?: boolean;
  }

  export interface BasicSecurity {
    type: 'basic';
    description?: string;
  }

  export interface ApiKeySecurity {
    type: 'apiKey';
    name: string;
    in: 'query' | 'header';
    description?: string;
  }

  export interface OAuth2ImplicitSecurity {
    type: 'oauth2';
    description?: string;
    flow: 'implicit';
    authorizationUrl: string;
  }

  export interface OAuth2PasswordSecurity {
    type: 'oauth2';
    description?: string;
    flow: 'password';
    tokenUrl: string;
    scopes?: OAuthScope[];
  }

  export interface OAuth2ApplicationSecurity {
    type: 'oauth2';
    description?: string;
    flow: 'application';
    tokenUrl: string;
    scopes?: OAuthScope[];
  }

  export interface OAuth2AccessCodeSecurity {
    type: 'oauth2';
    description?: string;
    flow: 'accessCode';
    tokenUrl: string;
    authorizationUrl: string;
    scopes?: OAuthScope[];
  }

  export interface OAuthScope {
    [name: string]: string;
  }

  export type Security = BasicSecurity
    | ApiKeySecurity
    | OAuth2AccessCodeSecurity
    | OAuth2ApplicationSecurity
    | OAuth2ImplicitSecurity
    | OAuth2PasswordSecurity;
}
