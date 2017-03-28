export namespace Swagger {
  export interface Info {
    title?: string;
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

  export interface Example { }

  export interface Header extends BaseSchema {
    type: string;
  }

  export interface BaseParameter {
    name: string;
    in: string;
    required?: boolean;
    description?: string;
  }

  export interface BodyParameter extends BaseParameter {
    schema?: Schema;
  }

  export interface QueryParameter extends BaseParameter, BaseSchema {
    type: string;
    format?: string;
    allowEmptyValue?: boolean;
  }

  export interface PathParameter extends BaseParameter {
    type: string;
    format?: string;
    required: boolean;
  }

  export interface HeaderParameter extends BaseParameter {
    type: string;
    format?: string;
  }

  export interface FormDataParameter extends BaseParameter, BaseSchema {
    type: string;
    collectionFormat?: string;
  }

  export type Parameter =
    BodyParameter |
    FormDataParameter |
    QueryParameter |
    PathParameter |
    HeaderParameter;

  export interface Path {
    $ref?: string;
    get?: Operation;
    put?: Operation;
    post?: Operation;
    delete?: Operation;
    options?: Operation;
    head?: Operation;
    patch?: Operation;
    parameters?: [Parameter];
  }

  export interface Operation {
    responses: { [responseName: string]: Response };
    summary?: string;
    description?: string;
    externalDocs?: ExternalDocs;
    operationId?: string;
    produces?: [string];
    consumes?: [string];
    parameters?: [Parameter];
    schemes?: [string];
    deprecated?: boolean;
    security?: [Secuirty];
    tags?: [string];
  }

  export interface Response {
    description: string;
    schema?: Schema;
    headers?: { [headerName: string]: Header };
    examples?: { [exampleName: string]: Example };
  }

  export interface BaseSchema {
    format?: string;
    title?: string;
    description?: string;
    default?: string | boolean | number | Object;
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
    enum?: string[] | number[];
    type?: string;
    items?: Schema | [Schema];
  }

  export interface Schema extends BaseSchema {
    $ref?: string;
    allOf?: [Schema];
    additionalProperties?: boolean | { [ref: string]: string };
    properties?: { [propertyName: string]: Schema };
    discriminator?: string;
    readOnly?: boolean;
    xml?: XML;
    externalDocs?: ExternalDocs;
    example?: { [exampleName: string]: Example };
    required?: string[];
  }

  export interface XML {
    type?: string;
    namespace?: string;
    prefix?: string;
    attribute?: string;
    wrapped?: boolean;
  }

  export interface BaseSecurity {
    type: string;
    description?: string;
  }

  export interface BasicAuthenticationSecurity extends BaseSecurity { }

  export interface ApiKeySecurity extends BaseSecurity {
    name: string;
    in: string;
  }

  export interface BaseOAuthSecuirty extends BaseSecurity {
    flow: string;
  }

  export interface OAuth2ImplicitSecurity extends BaseOAuthSecuirty {
    authorizationUrl: string;
  }

  export interface OAuth2PasswordSecurity extends BaseOAuthSecuirty {
    tokenUrl: string;
    scopes?: [OAuthScope];
  }

  export interface OAuth2ApplicationSecurity extends BaseOAuthSecuirty {
    tokenUrl: string;
    scopes?: [OAuthScope];
  }

  export interface OAuth2AccessCodeSecurity extends BaseOAuthSecuirty {
    tokenUrl: string;
    authorizationUrl: string;
    scopes?: [OAuthScope];
  }

  export interface OAuthScope {
    [scopeName: string]: string;
  }

  export type Secuirty =
    BasicAuthenticationSecurity |
    OAuth2AccessCodeSecurity |
    OAuth2ApplicationSecurity |
    OAuth2ImplicitSecurity |
    OAuth2PasswordSecurity |
    ApiKeySecurity;

  export interface Spec {
    swagger: string;
    info: Info;
    externalDocs?: ExternalDocs;
    host?: string;
    basePath?: string;
    schemes?: [string];
    consumes?: [string];
    produces?: [string];
    paths: { [pathName: string]: Path };
    definitions?: { [definitionsName: string]: Schema };
    parameters?: { [parameterName: string]: BodyParameter | QueryParameter };
    responses?: { [responseName: string]: Response };
    security?: [Secuirty];
    securityDefinitions?: { [securityDefinitionName: string]: Secuirty };
    tags?: [Tag];
  }
}
