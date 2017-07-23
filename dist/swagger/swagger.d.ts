export declare namespace Swagger {
    interface Info {
        title?: string;
        version?: string;
        description?: string;
        termsOfService?: string;
        contact?: Contact;
        license?: License;
    }
    interface Contact {
        name?: string;
        email?: string;
        url?: string;
    }
    interface License {
        name: string;
        url?: string;
    }
    interface ExternalDocs {
        url: string;
        description?: string;
    }
    interface Tag {
        name: string;
        description?: string;
        externalDocs?: ExternalDocs;
    }
    interface Example {
    }
    interface Header extends BaseSchema {
        type: string;
    }
    interface BaseParameter {
        name: string;
        in: string;
        required?: boolean;
        description?: string;
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
    }
    interface BodyParameter extends BaseParameter {
        schema?: Schema;
    }
    interface QueryParameter extends BaseParameter, BaseSchema {
        type: string;
        format?: string;
        allowEmptyValue?: boolean;
    }
    interface PathParameter extends BaseParameter {
        type: string;
        format?: string;
        required: boolean;
    }
    interface HeaderParameter extends BaseParameter {
        type: string;
        format?: string;
    }
    interface FormDataParameter extends BaseParameter, BaseSchema {
        type: string;
        collectionFormat?: string;
    }
    type Parameter = BodyParameter | FormDataParameter | QueryParameter | PathParameter | HeaderParameter;
    interface Path {
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
    interface Operation {
        responses: {
            [responseName: string]: Response;
        };
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
    interface Response {
        description: string;
        schema?: Schema;
        headers?: {
            [headerName: string]: Header;
        };
        examples?: {
            [exampleName: string]: Example;
        };
    }
    interface BaseSchema {
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
        enum?: [string];
        type?: string;
        items?: Schema | [Schema];
    }
    interface Schema extends BaseSchema {
        $ref?: string;
        allOf?: [Schema];
        additionalProperties?: boolean | Schema;
        properties?: {
            [propertyName: string]: Schema;
        };
        discriminator?: string;
        readOnly?: boolean;
        xml?: XML;
        externalDocs?: ExternalDocs;
        example?: {
            [exampleName: string]: Example;
        };
        required?: string[];
    }
    interface XML {
        type?: string;
        namespace?: string;
        prefix?: string;
        attribute?: string;
        wrapped?: boolean;
    }
    interface BaseSecurity {
        type: string;
        description?: string;
    }
    interface BasicAuthenticationSecurity extends BaseSecurity {
    }
    interface ApiKeySecurity extends BaseSecurity {
        name: string;
        in: string;
    }
    interface BaseOAuthSecuirty extends BaseSecurity {
        flow: string;
    }
    interface OAuth2ImplicitSecurity extends BaseOAuthSecuirty {
        authorizationUrl: string;
    }
    interface OAuth2PasswordSecurity extends BaseOAuthSecuirty {
        tokenUrl: string;
        scopes?: [OAuthScope];
    }
    interface OAuth2ApplicationSecurity extends BaseOAuthSecuirty {
        tokenUrl: string;
        scopes?: [OAuthScope];
    }
    interface OAuth2AccessCodeSecurity extends BaseOAuthSecuirty {
        tokenUrl: string;
        authorizationUrl: string;
        scopes?: [OAuthScope];
    }
    interface OAuthScope {
        [scopeName: string]: string;
    }
    type Secuirty = BasicAuthenticationSecurity | OAuth2AccessCodeSecurity | OAuth2ApplicationSecurity | OAuth2ImplicitSecurity | OAuth2PasswordSecurity | ApiKeySecurity;
    interface Spec {
        swagger: string;
        info: Info;
        externalDocs?: ExternalDocs;
        host?: string;
        basePath?: string;
        schemes?: [string];
        consumes?: [string];
        produces?: [string];
        paths: {
            [pathName: string]: Path;
        };
        definitions?: {
            [definitionsName: string]: Schema;
        };
        parameters?: {
            [parameterName: string]: BodyParameter | QueryParameter;
        };
        responses?: {
            [responseName: string]: Response;
        };
        security?: [Secuirty];
        securityDefinitions?: {
            [securityDefinitionName: string]: Secuirty;
        };
        tags?: [Tag];
    }
}
