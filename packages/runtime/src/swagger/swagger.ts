// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Swagger {
  export type DataType = 'integer' | 'number' | 'boolean' | 'string' | 'array' | 'object' | 'file' | 'undefined';

  export type DataFormat = 'int32' | 'int64' | 'float' | 'double' | 'byte' | 'binary' | 'date' | 'date-time' | 'password';

  export type Protocol = 'http' | 'https' | 'ws' | 'wss';

  export type SupportedSpecMajorVersion = 2 | 3 | 3.1;

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
    parameters?: { [name: string]: Parameter2 };
    responses?: { [name: string]: Response };
    security?: Security[];
    securityDefinitions?: { [name: string]: SecuritySchemes };
  }

  /**
   * Base interface for all OpenAPI 3.x specifications
   * Contains fields shared across all 3.x versions
   */
  export interface Spec3x extends Spec {
    servers: Server[];
  }

  /**
   * OpenAPI 3.0.x specification
   */
  export interface Spec30 extends Spec3x {
    openapi: '3.0.0';
    components: Components;
    paths: { [name: string]: Path3 };
  }

  /**
   * OpenAPI 3.1.x specification
   */
  export interface Spec31 extends Spec3x {
    openapi: '3.1.0';
    components: Components31;
    paths: { [name: string]: Path31 };
  }

  /**
   * Union type representing any OpenAPI 3.x specification (3.0 or 3.1)
   * Use Spec30 or Spec31 when you know the specific version
   */
  export type Spec3 = Spec30 | Spec31;

  export interface Path31 {
    $ref?: string;
    get?: Operation31;
    put?: Operation31;
    post?: Operation31;
    delete?: Operation31;
    options?: Operation31;
    head?: Operation31;
    patch?: Operation31;
    parameters?: Parameter31[];
  }

  export interface Components {
    callbacks?: { [name: string]: unknown };
    examples?: { [name: string]: Example3 | string };
    headers?: { [name: string]: unknown };
    links?: { [name: string]: unknown };
    parameters?: { [name: string]: Parameter3 };
    requestBodies?: { [name: string]: unknown };
    responses?: { [name: string]: Response };
    schemas?: { [name: string]: Schema3 };
    securitySchemes?: { [name: string]: SecuritySchemes };
  }

  export interface Components31 extends Omit<Components, 'schemas'> {
    schemas?: { [name: string]: Schema31 };
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

  export interface Example3 {
    value: unknown;
    summary?: string;
    description?: string;
  }

  export type BaseParameter = {
    name: string;
    in: 'query' | 'header' | 'path' | 'formData' | 'body' | 'cookie';
    required?: boolean;
    description?: string;
    deprecated?: boolean;
    [ext: `x-${string}`]: unknown;
  } & Pick<BaseSchema, 'type' | 'items' | 'enum' | 'format' | 'minimum' | 'maximum' | 'minLength' | 'maxLength' | 'pattern'>;

  export type BodyParameter = BaseParameter & {
    in: 'body';
  };

  export type FormDataParameter = BaseParameter & {
    in: 'formData';
    type: DataType;
    format?: DataFormat;
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
    default?: unknown;
  };

  type QueryParameter = BaseParameter & {
    in: 'query';
    type: DataType;
    format?: DataFormat;
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
    default?: unknown;
  };

  type PathParameter = BaseParameter & {
    in: 'path';
    type: DataType;
    format?: DataFormat;
    default?: unknown;
  };

  type HeaderParameter = BaseParameter & {
    in: 'header';
    type: DataType;
    format?: DataFormat;
    default?: unknown;
  };

  type Swagger2BaseParameter = BaseParameter & {
    schema: Schema2;
  };

  export type Swagger2BodyParameter = Swagger2BaseParameter & BodyParameter;
  export type Swagger2FormDataParameter = Swagger2BaseParameter & FormDataParameter;
  export type Swagger2QueryParameter = Swagger2BaseParameter & QueryParameter;
  export type Swagger2PathParameter = Swagger2BaseParameter & PathParameter;
  export type Swagger2HeaderParameter = Swagger2BaseParameter & HeaderParameter;

  export type Parameter2 = Swagger2BodyParameter | Swagger2FormDataParameter | Swagger2QueryParameter | Swagger2PathParameter | Swagger2HeaderParameter;

  export function isQueryParameter(parameter: unknown): parameter is Swagger2QueryParameter {
    return typeof parameter === 'object' && parameter !== null && 'in' in parameter && parameter.in === 'query';
  }

  export interface Parameter3 extends BaseParameter {
    in: 'query' | 'header' | 'path' | 'cookie';
    schema: Schema3;
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    example?: unknown;
    examples?: { [name: string]: Example3 | string };
  }

  export interface Parameter31 extends Omit<Parameter3, 'schema'> {
    schema: Schema31;
  }

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

    [ext: `x-${string}`]: unknown;
  }

  export interface Operation31 extends Omit<Operation3, 'responses' | 'requestBody' | 'parameters'> {
    parameters?: Parameter31[];
    requestBody?: RequestBody31;
    responses: { [name: string]: Response31 };
  }

  export interface RequestBody {
    content: { [requestMediaType: string]: MediaType };
    description?: string;
    required?: boolean;
  }

  export interface RequestBody31 {
    content: { [requestMediaType: string]: MediaType31 };
    description?: string;
    required?: boolean;
    $ref?: string;
    summary?: string;
    examples?: { [media: string]: Example3 | string };
    [ext: `x-${string}`]: unknown;
  }

  export interface MediaType {
    schema?: Schema3;
    example?: unknown;
    examples?: { [name: string]: Example3 | string };
    encoding?: { [name: string]: unknown };
  }

  export interface MediaType31 {
    schema?: Schema31;
    example?: unknown;
    examples?: { [name: string]: Example3 | string };
    encoding?: { [name: string]: unknown };
  }

  export interface Response {
    description: string;
    schema?: BaseSchema;
    headers?: { [name: string]: Header };
    examples?: { [responseMediaType: string]: { [exampleName: string]: Example3 | string } };
  }

  export interface Response3 {
    description: string;
    content?: {
      [responseMediaType: string]: {
        schema: Schema3;
        examples?: { [name: string]: Example3 | string };
      };
    };
    headers?: { [name: string]: Header3 };
  }

  export interface Response31 {
    description: string;
    content?: {
      [responseMediaType: string]: {
        schema?: Schema31;
        examples?: { [name: string]: Example3 | string };
        example?: unknown;
        encoding?: { [name: string]: unknown };
      };
    };
    headers?: { [name: string]: Header3 };
    links?: { [name: string]: unknown }; // If needed per spec
  }

  export interface BaseSchema<P = unknown> {
    type?: string;
    format?: DataFormat;
    $ref?: string;
    title?: string;
    description?: string;
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    default?: string | boolean | number | unknown;
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
    enum?: Array<boolean | string | number | null>;
    'x-enum-varnames'?: string[];

    [ext: `x-${string}`]: unknown;

    // moved from Schema
    additionalProperties?: boolean | BaseSchema;
    properties?: { [propertyName: string]: P };
    discriminator?: string;
    readOnly?: boolean;
    xml?: XML;
    externalDocs?: ExternalDocs;
    example?: unknown;
    required?: string[];

    items?: BaseSchema;
  }

  export interface Schema31 extends Omit<Schema3, 'items' | 'properties' | 'additionalProperties' | 'discriminator' | 'anyOf' | 'allOf'> {
    examples?: unknown[];

    properties?: { [key: string]: Schema31 };
    additionalProperties?: boolean | Schema31;

    items?: Schema31 | false;
    prefixItems?: Schema31[];
    contains?: Schema31;

    allOf?: Schema31[];
    anyOf?: Schema31[];
    oneOf?: Schema31[];
    not?: Schema31;
    propertyNames?: Schema31;

    discriminator?: {
      propertyName: string;
      mapping?: Record<string, string>;
    };
  }

  export interface Schema3 extends Omit<BaseSchema, 'type'> {
    type?: DataType;
    nullable?: boolean;
    anyOf?: BaseSchema[];
    allOf?: BaseSchema[];
    deprecated?: boolean;
    properties?: { [propertyName: string]: Schema3 };
  }

  export interface Schema2 extends BaseSchema {
    type?: DataType;
    properties?: { [propertyName: string]: Schema2 };
    ['x-nullable']?: boolean;
    ['x-deprecated']?: boolean;
  }

  export interface Header {
    description?: string;
    type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
    format?: string;
    items?: BaseSchema;
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    default?: string | boolean | number | unknown;
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

  export interface Header3 {
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;

    style?: string;
    explode?: boolean;
    allowReserved?: boolean;

    schema?: Schema3 | Schema31;
    example?: unknown;
    examples?: { [media: string]: Example3 | string };

    content?: {
      [media: string]: {
        schema?: Schema3 | Schema31;
        example?: unknown;
        examples?: { [name: string]: Example3 | string };
      };
    };

    [ext: `x-${string}`]: unknown;
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

  export interface ApiKeySecurity extends BaseSecurity {
    type: 'apiKey';
    name: string;
    in: 'query' | 'header';
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

  export interface BearerSecurity3 extends BaseSecurity {
    type: 'http';
    scheme: 'bearer';
    bearerFormat?: string;
  }

  export interface OpenIDSecurity extends BaseSecurity {
    type: 'openIdConnect';
    openIdConnectUrl: string;
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
  export type SecuritySchemes =
    | ApiKeySecurity
    | BasicSecurity
    | BasicSecurity3
    | BearerSecurity3
    | OpenIDSecurity
    | OAuth2AccessCodeSecurity
    | OAuth2ApplicationSecurity
    | OAuth2ImplicitSecurity
    | OAuth2PasswordSecurity
    | OAuth2Security3;
  export interface Security {
    [key: string]: string[];
  }
}
