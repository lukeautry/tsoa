export namespace Swagger {
  export type DataType = 'integer' | 'number' | 'boolean' | 'string' | 'array' | 'object' | 'file';

  export type DataFormat = 'int32' | 'int64' | 'float' | 'double' | 'byte' | 'binary' | 'date' | 'date-time' | 'password';

  export type Protocol = 'http' | 'https' | 'ws' | 'wss';

  export type SupportedSpecMajorVersion = 2 | 3;

  export interface Spec {
    info: Info;
    tags?: Tag[];
    externalDocs?: ExternalDocs;
  }

  export interface Spec2 extends Spec {
    swagger: '2.0';
    host?: string;
    basePath?: string;
    schemes?: Protocol[];
    consumes?: string[];
    produces?: string[];
    paths: { [name: string]: Path };
    definitions?: { [name: string]: Schema2 };
    parameters?: { [name: string]: Parameter };
    responses?: { [name: string]: Response };
    security?: Security[];
    securityDefinitions?: { [name: string]: Security };
  }

  export interface Spec3 extends Spec {
    openapi: '3.0.0';
    servers: Server[];
    components: Components;
    paths: { [name: string]: Path3 };
  }

  export interface Components {
    callbacks?: { [name: string]: any };
    examples?: { [name: string]: Example3 | string };
    headers?: { [name: string]: any };
    links?: { [name: string]: any };
    parameters?: { [name: string]: Parameter };
    requestBodies?: { [name: string]: any };
    responses?: { [name: string]: Response };
    schemas?: { [name: string]: Schema3 };
    securitySchemes?: { [name: string]: Security };
  }

  export interface Server {
    url: string;
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
    examples?: { [exampleName: string]: Swagger.Example3 };
  }

  export interface Example3 {
    value: unknown;
    summary?: string;
    description?: string;
  }

  export interface BaseParameter extends BaseSchema {
    name: string;
    in: 'query' | 'header' | 'path' | 'formData' | 'body';
    required?: boolean;
    description?: string;
    example?: unknown;
    examples?: { [name: string]: Example3 | string };
    schema: Schema;
    type: DataType;
    format?: DataFormat;
    deprecated?: boolean;
  }

  export interface BodyParameter extends BaseParameter {
    in: 'body';
  }

  export interface QueryParameter extends BaseParameter {
    in: 'query';
    allowEmptyValue?: boolean;
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
  }

  export function isQueryParameter(parameter: BaseParameter): parameter is QueryParameter {
    return parameter.in === 'query';
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

  export type Parameter = BodyParameter | FormDataParameter | QueryParameter | PathParameter | HeaderParameter;
  export type Parameter2 = Omit<Parameter & { 'x-deprecated'?: boolean }, 'deprecated'>;
  export type Parameter3 = Parameter;

  export interface Path {
    $ref?: string;
    get?: Operation;
    put?: Operation;
    post?: Operation;
    delete?: Operation;
    options?: Operation;
    head?: Operation;
    patch?: Operation;
    parameters?: Parameter2[];
  }

  export interface Path3 {
    $ref?: string;
    get?: Operation3;
    put?: Operation3;
    post?: Operation3;
    delete?: Operation3;
    options?: Operation3;
    head?: Operation3;
    patch?: Operation3;
    parameters?: Parameter3[];
  }

  export interface Operation {
    tags?: string[];
    summary?: string;
    description?: string;
    externalDocs?: ExternalDocs;
    operationId: string;
    consumes?: string[];
    produces?: string[];
    parameters?: Parameter2[];
    responses: { [name: string]: Response };
    schemes?: Protocol[];
    deprecated?: boolean;
    security?: Security[];
    // Used to apply extensions to paths
    [key: string]: unknown;
  }

  export interface Operation3 {
    tags?: string[];
    summary?: string;
    description?: string;
    externalDocs?: ExternalDocs;
    operationId: string;
    consumes?: string[];
    parameters?: Parameter3[];
    responses: { [name: string]: Response3 };
    schemes?: Protocol[];
    deprecated?: boolean;
    security?: Security[];
    requestBody?: RequestBody;
  }

  export interface RequestBody {
    content: { [name: string]: MediaType };
    description?: string;
    required?: boolean;
  }

  export interface MediaType {
    schema?: Schema3;
    example?: unknown;
    examples?: { [name: string]: Example3 | string };
    encoding?: { [name: string]: any };
  }

  export interface Response {
    description: string;
    schema?: Schema;
    headers?: { [name: string]: Header };
    examples?: Example;
  }

  export interface Response3 {
    description: string;
    content?: { [name: string]: Schema & Example };
    headers?: { [name: string]: Header3 };
  }

  export interface BaseSchema {
    type?: string;
    format?: DataFormat;
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
    enum?: Array<string | number | null>;
    'x-enum-varnames'?: string[];
    items?: BaseSchema;
  }

  export interface Schema3 extends Omit<Schema, 'type'> {
    type?: DataType;
    nullable?: boolean;
    anyOf?: BaseSchema[];
    allOf?: BaseSchema[];
    deprecated?: boolean;
  }

  export interface Schema2 extends Schema {
    properties?: { [propertyName: string]: Schema2 };
    ['x-nullable']?: boolean;
    ['x-deprecated']?: boolean;
  }

  export interface Schema extends BaseSchema {
    type?: DataType;
    format?: DataFormat;
    additionalProperties?: boolean | BaseSchema;
    properties?: { [propertyName: string]: Schema3 };
    discriminator?: string;
    readOnly?: boolean;
    xml?: XML;
    externalDocs?: ExternalDocs;
    example?: unknown;
    required?: string[];
  }

  export interface Header {
    description?: string;
    type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
    format?: string;
    items?: BaseSchema;
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
    default?: string | boolean | number | any;
    maximum?: number;
    exclusiveMaximum?: boolean;
    minimum?: number;
    exclusiveMinimum?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    enum?: Array<string | number | null>;
    multipleOf?: number;
  }

  export interface Header3 extends BaseSchema {
    required?: boolean;
    description?: string;
    example?: unknown;
    examples?: {
      [name: string]: Example3 | string;
    };
    schema: Schema;
    type?: DataType;
    format?: DataFormat;
  }

  export interface XML {
    type?: string;
    namespace?: string;
    prefix?: string;
    attribute?: string;
    wrapped?: boolean;
  }

  interface BaseSecurity {
    description?: string;
  }

  interface BaseOAuthSecurity extends BaseSecurity {
    scopes?: OAuthScope;
  }

  export interface BasicSecurity3 extends BaseSecurity {
    type: 'http';
    scheme: 'basic';
  }

  export interface BasicSecurity extends BaseSecurity {
    type: 'basic';
  }

  export interface ApiKeySecurity extends BaseSecurity {
    type: 'apiKey';
    name: string;
    in: 'query' | 'header';
  }

  export interface OAuth2Security3 extends BaseSecurity {
    type: 'oauth2';
    flows: OAuthFlow;
  }

  export interface OAuth2SecurityFlow3 extends BaseSecurity {
    tokenUrl?: string;
    authorizationUrl?: string;
    scopes?: OAuthScope;
  }

  export interface OAuth2ImplicitSecurity extends BaseOAuthSecurity {
    type: 'oauth2';
    description?: string;
    flow: 'implicit';
    authorizationUrl: string;
  }

  export interface OAuth2PasswordSecurity extends BaseOAuthSecurity {
    type: 'oauth2';
    flow: 'password';
    tokenUrl: string;
  }

  export interface OAuth2ApplicationSecurity extends BaseOAuthSecurity {
    type: 'oauth2';
    flow: 'application';
    tokenUrl: string;
  }

  export interface OAuth2AccessCodeSecurity extends BaseOAuthSecurity {
    type: 'oauth2';
    flow: 'accessCode';
    tokenUrl: string;
    authorizationUrl: string;
  }

  export interface OAuthScope {
    [scopeName: string]: string;
  }

  export type OAuthFlow = {
    [flowName in OAuth2FlowTypes]?: OAuth2SecurityFlow3;
  };
  export type OAuth2FlowTypes = 'authorizationCode' | 'implicit' | 'password' | 'clientCredentials';
  export type Security = BasicSecurity | BasicSecurity3 | ApiKeySecurity | OAuth2AccessCodeSecurity | OAuth2ApplicationSecurity | OAuth2ImplicitSecurity | OAuth2PasswordSecurity | OAuth2Security3;
}
