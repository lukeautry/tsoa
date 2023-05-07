import { Swagger } from './swagger/swagger';
import { Options as MulterOpts } from 'multer';

export interface Config {
  /**
   * Swagger generation configuration object
   */
  spec: SpecConfig;

  /**
   * Route generation configuration object
   */
  routes: RoutesConfig;

  /**
   * Directories to ignore during TypeScript metadata scan
   */
  ignore?: string[];

  /**
   * The entry point to your API
   */
  entryFile: string;

  /**
   * An array of path globs that point to your route controllers that you would like to have tsoa include.
   */
  controllerPathGlobs?: string[];

  /**
   * Modes that allow you to prevent input data from entering into your API. This will document your decision in the swagger.yaml and it will turn on excess-property validation (at runtime) in your routes.
   */
  noImplicitAdditionalProperties?: 'throw-on-extras' | 'silently-remove-extras' | 'ignore';

  /**
   * Typescript CompilerOptions to be used during generation
   *
   * @type {Record<string, unknown>}
   * @memberof RoutesConfig
   */
  compilerOptions?: Record<string, unknown>;

  /**
   * Multer's options to generate multer's middleware.
   * It doesn't support storage option
   *
   * @example {
   *   "dest": "/tmp"
   * } Allow multer to write to file instead of using Memory's buffer
   */
  multerOpts?: MulterOpts;


  /*
   * OpenAPI number type to be used for TypeScript's 'number', when there isn't a type annotation
   * @default double
   */
  defaultNumberType?: 'double' | 'float' | 'integer' | 'long'
}

/**
 * these options will be removed in a future version since we would prefer consumers to explicitly state their preference that the tsoa validation throws or removes additional properties
 */
export type DeprecatedOptionForAdditionalPropertiesHandling = true | false;

export interface SpecConfig {
  /**
   * Generated SwaggerConfig.json will output here
   */
  outputDirectory: string;

  /**
   * API host, expressTemplate.g. localhost:3000 or myapi.com
   */
  host?: string;

  /**
   * Base-name of swagger.json or swagger.yaml.
   *
   * @default: "swagger"
   */
  specFileBaseName?: string;

  /**

   * API version number; defaults to npm package version
   */
  version?: string;

  /**
   * Major OpenAPI version to generate; defaults to version 2 when not specified
   * Possible values:
   *  - 2: generates OpenAPI version 2.
   *  - 3: generates OpenAPI version 3.
   */
  specVersion?: Swagger.SupportedSpecMajorVersion;

  /**
   * API name; defaults to npm package name
   */
  name?: string;

  /**
   * API description; defaults to npm package description
   */
  description?: string;

  /**
   * Link to the page that describes the terms of service.
   * Must be in the URL format.
   */
  termsOfService?: string;

  /**
   * Contact Information
   */
  contact?: {
    /**
     * The identifying name of the contact person/organization.
     * @default npm package author
     */
    name?: string;

    /**
     * The email address of the contact person/organization.
     * @default npm package author email
     */
    email?: string;

    /**
     * API Info url
     * The URL pointing to the contact information.
     * @default npm package author url
     */
    url?: string;
  };

  /**
   * API license; defaults to npm package license
   */
  license?: string;

  /**
   * Base API path; e.g. the 'v1' in https://myapi.com/v1
   */
  basePath?: string;

  /**
   * Extend generated swagger spec with this object
   * Note that generated properties will always take precedence over what get specified here
   */
  spec?: unknown;

  /**
   * Alter how the spec is merged to generated swagger spec.
   * Possible values:
   *  - 'immediate' is overriding top level elements only thus you can not append a new path or alter an existing value without erasing same level elements.
   *  - 'recursive' proceed to a deep merge and will concat every branches or override or create new values if needed. @see https://www.npmjs.com/package/merge
   *  - 'deepmerge' uses `deepmerge` to merge, which will concat object branches and concat arrays as well @see https://www.npmjs.com/package/deepmerge
   * The default is set to immediate so it is not breaking previous versions.
   * @default 'immediate'
   */
  specMerging?: 'immediate' | 'recursive' | 'deepmerge';

  /**
   * Template string for generating operation ids.
   * This should be a valid handlebars template and is provided
   * with the following context:
   *   - 'controllerName' - String name of controller class.
   *   - 'method' - Tsoa.Method object.
   *
   * @default '{{titleCase method.name}}'
   */
  operationIdTemplate?: string;

  /**
   * Security Definitions Object
   * A declaration of the security schemes available to be used in the
   * specification. This does not enforce the security schemes on the operations
   * and only serves to provide the relevant details for each scheme.
   */
  securityDefinitions?: {
    [name: string]: Swagger.SecuritySchemes;
  };

  /**
   * Swagger Tags Information for your API
   */
  tags?: Swagger.Tag[];

  yaml?: boolean;

  schemes?: Swagger.Protocol[];

  /**
   * Enable x-enum-varnames support
   * @default false
   */
  xEnumVarnames?: boolean;

  /**
   * Sets a title for inline objects for responses and requestBodies
   * This helps to generate more consistent clients
   */
  useTitleTagsForInlineObjects?: boolean;

  /**
   * Applies a default security to the entire API.
   * Can be overridden with @Security or @NoSecurity decorators on controllers or methods
   */
  rootSecurity?: Swagger.Security[];
}

export interface RoutesConfig {
  /**
   * Routes directory; generated routes.ts (which contains the generated code wiring up routes using middleware of choice) will be dropped here
   */
  routesDir: string;

  /**
   * Routes filename; the filename of the generated route file ('routes.ts' by default)
   */
  routesFileName?: string;

  /**
   * Avoid writing the generated route file if the existing file is identical (useful to optimize watch processes); false by default
   */
  noWriteIfUnchanged?: boolean;

  /**
   * Base API path; e.g. the '/v1' in https://myapi.com/v1
   */
  basePath?: string;

  /**
   * Middleware provider.
   */
  middleware?: 'express' | 'hapi' | 'koa';

  /**
   * Override the Middleware template
   */
  middlewareTemplate?: string;

  /**
   * IOC module; e.g. './inversify/ioc' where IOC container named `iocContainer` is defined (https://github.com/inversify/InversifyJS)
   */
  iocModule?: string;

  /**
   * Authentication Module for express, hapi and koa
   */
  authenticationModule?: string;

  /**
   * When enabled, the imports in the routes files will have a `.js` extention to support esm.
   *
   * @default false
   */
  esm?: boolean;
}
