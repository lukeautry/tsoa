# tsoa
Pronounced so·uh

[![Codeship Status for lukeautry/tsoa](https://codeship.com/projects/cdce38d0-1f6b-0134-258e-1ed679ae6c9d/status?branch=master)](https://codeship.com/projects/160322)
[![npm version](https://img.shields.io/npm/v/tsoa/latest)](https://www.npmjs.com/package/tsoa)

## The Rendered Documentation can be found [here](https://tsoa-community.github.io/docs/index).

## Table of Contents

  * [Goal](#goal)
  * [Philosophy](#philosophy)
  * [How it works](#how-it-works)
    - [Installation](#installation)
    - [Create Controllers](#create-controllers)
    - [Create Models](#create-models)
    - [Generate](#generate)
      + [Using CLI](#using-cli)
      + [Programmatic](#programmatic)
      + [Automating Regeneration](#automating-regeneration)
    - [Can I use OpenAPI 3.0 instead of OpenAPI 2 (formerly Swagger)?](#can-i-use-openapi-3-instead-of-openapi-2-(formerly-swagger))
    - [How to ensure no additional properties come in at runtime](#how-to-ensure-no-additional-properties-come-in-at-runtime)
    - [Dealing with duplicate model names](#dealing-with-duplicate-model-names)
    - [Overriding route template](#overriding-route-template)
    - [Consuming generated routes](#consuming-generated-routes)
    - [Get access to the request object of express in Controllers](#get-access-to-the-request-object-of-express-in-controllers)
    - [Dependency injection or IOC](#dependency-injection-or-ioc)
      + [InversifyJS](#inversifyjs)
      + [typescript-ioc](#typescript-ioc)
    - [Specify error response types for OpenAPI](#specify-error-response-types-for-openapi)
    - [Authentication](#authentication)
    - [Path mapping](#path-mapping)
    - [Uploading files](#uploading-files)
    - [Using awesome OpenAPI tools](#using-awesome-openapi-tools)
  * [Decorators](#decorators)
    - [Security](#security)
    - [Tags](#tags)
    - [OperationId](#operationid)
    - [Deprecated](#deprecated)
  * [Command Line Interface](#command-line-interface)
    - [OpenAPI spec generation](#spec-generation)
    - [Route generation](#route-generation)
  * [Examples](#examples)
  * [Help wanted](#help-wanted)

## Goal

- TypeScript controllers and models as the single source of truth for your API
- A valid OpenAPI (formerly Swagger) spec (2.0 or 3.0 if you choose 😍) is generated from your controllers and models, including:
    - Paths (e.g. GET /Users)
    - Definitions based on TypeScript interfaces (models)
    - Parameters/model properties marked as required or optional based on TypeScript (e.g. myProperty?: string is optional in the OpenAPI spec)
    - jsDoc supported for object descriptions (most other metadata can be inferred from TypeScript types)
- Routes are generated for middleware of choice
    - Express, Hapi, and Koa currently supported, other middleware can be supported using a simple handlebars template
    - Validate request payloads

## Philosophy

- Rely on TypeScript type annotations to generate API metadata if possible
- If regular type annotations aren't an appropriate way to express metadata, use decorators
- Use jsdoc for pure text metadata (e.g. endpoint descriptions)
- Minimize boilerplate
- Models are best represented by interfaces (pure data structures), but can also be represented by classes
- Runtime validation of tsoa should behave as closely as possible to the specifications that the generated OpenAPI 2/3 schema describes. Any differences in validation logic are clarified by logging warnings during the generation of the OpenAPI Specification (OAS) and/or the routes.
    - Please note that by enabling OpenAPI 3 you minimize the chances of divergent validation logic since OpenAPI 3 has a more expressive schema syntax.

## How it works

### Installation

```sh
npm install tsoa --save
// OR
npm install lukeautry/tsoa#[VERSION]
```

### Create Controllers

```typescript
// controllers/usersController.ts

import { Body, Controller, Get, Header, Path, Post, Query, Route, SuccessResponse } from 'tsoa';
import { User, UserCreationRequest } from '../models/user';
import { UserService } from '../services/userService';

@Route('Users')
export class UsersController extends Controller {
  @Get('{id}')
  public async getUser(id: number, @Query() name: string): Promise<User> {
    return await new UserService().get(id);
  }

  @SuccessResponse('201', 'Created') // Custom success response
  @Post()
  public async createUser(@Body() requestBody: UserCreationRequest): Promise<void> {
    new UserService().create(request);
    this.setStatus(201); // set return status 201
    return Promise.resolve();
  }

  @Get('subResource/{subResourceId}')
  public async getSubResource(@Path('subResourceId') aliasedPathId: number, @Header('Authorization') authorization: string): Promise<User> {
    return new UserService().getSubResource(aliasedPathId);
  }
}
```
Note: tsoa can not create OpenAPI 2 (formerly Swagger) documents from interfaces that are defined in external dependencies. This is by design. Full explanation available in [ExternalInterfacesExplanation.MD](https://github.com/lukeautry/tsoa/blob/master/docs/ExternalInterfacesExplanation.MD)

### Create Models
```typescript
// models/user.ts

export interface User {
  id: number;
  email: string;
  name: Name;
  status?: status;
  phoneNumbers: string[];
}

export type status = 'Happy' | 'Sad';

export interface Name {
  first: string;
  last?: string;
}

export interface UserCreationRequest {
  email: string;
  name: Name;
  phoneNumbers: string[];
}
```

### Generate

#### Using CLI
```typescript
// generate OAS
tsoa spec

// generate routes
tsoa routes
```

See [CLI documentation](#command-line-interface)

#### Programmatic

```typescript
import { generateRoutes, generateSpec, ExtendedRoutesConfig, ExtendedSpecConfig } from 'tsoa';

(async () => {
  const specOptions: ExtendedSpecConfig = {
    basePath: '/api',
    entryFile: './api/server.ts',
    specVersion: 3,
    outputDirectory: './api/dist',
    controllerPathGlobs: ['./routeControllers/**/*Controller.ts'],
  };

  const routeOptions: ExtendedRoutesConfig = {
    basePath: '/api',
    entryFile: './api/server.ts',
    routesDir: './api',
  };

  await generateSpec(specOptions);

  await generateRoutes(routeOptions);
})();
```

**Note:** If you use tsoa pragmatically, please be aware that tsoa's methods can (under rare circumstances) change in minor and patch releases. But if you are using tsoa in a .ts file, then TypeScript will help you migrate to any changes. We reserve this right to change what are essentially our internal methods so that we can continue to provide incremental value to the majority user (our CLI users). The CLI however will only receive breaking changes during a major release.

#### Automating Regeneration

You might find it convenient to automatically generate again. To do this, add a section to your package.json's script section with the following:
```js
  "scripts": {
    // ... other stuff (note that comments are not valid JSON, so please remove this)
    "tsoa:gen": "yarn tsoa spec -c ./api/tsoa.json && yarn tsoa routes -c ./api/tsoa.json"
  },
```

Then when you've made a change to an API, you simply run "yarn tsoa:gen"

Note: You can also integrate the OpenAPI 2 (formerly Swagger) regeneration directly into your build step, but there are risks. To do that, ADDITIONAL add it to your build script in package.json:
```js
  "scripts": {
    // ... other stuff (note that comments are not valid JSON, so please remove this)
    "build:api": "tsoa:gen && yarn tsc -p ./api/tsconfig.json",
  },
```

### Can I use OpenAPI 3 instead of OpenAPI 2 (formerly Swagger)?

Yes, set `spec.specVersion` to `3` in your `tsoa.json` file. See more config options by looking at [the config type definition](https://github.com/lukeautry/tsoa/blob/master/src/config.ts).

### How to ensure no additional properties come in at runtime

By default, OpenAPI allows for models to have [`additionalProperties`](https://swagger.io/docs/specification/data-models/dictionaries/). If you would like to ensure at runtime that the data has only the properties defined in your models, set the `noImplicitAdditionalProperties` [config](https://github.com/lukeautry/tsoa/blob/master/src/config.ts) option to either `"silently-remove-extras"` or `"throw-on-extras"`.

Caveats:
  * The following types will always allow additional properties due to the nature of the way they work:
    * The `any` type
    * An indexed type (which explicitly allows additional properties) like `export interface IStringToStringDictionary { [key: string] : string }`
  * If you are using tsoa for an existing service that has consumers...
    * you will need to inform your consumers before setting `noImplicitAdditionalProperties` to `"throw-on-extras"` since it would be a breaking change (due to the fact that request bodies that previously worked would now get an error).
  * Regardless, `"noImplicitAdditionalProperties" : "silently-remove-extras"` is a great choice for both legacy AND new APIs (since this mirrors the behavior of C# serializers and other popular JSON serializers).

### Dealing with duplicate model names
If you have multiple models with the same name, you may get errors indicating that there are multiple matching models. If you'd like to designate a class/interface as the 'canonical' version of a model, add a jsdoc element marking it as such:

```ts
/**
 * @tsoaModel
 */
export interface MyModel {
  ...
}
```

### Overriding route template

If you want functionality that tsoa doesn't provide, then one powerful (but potentially costly approach) is to provide tsoa with a custom handlebars template to use when generating the routes.ts file.

**WARNING** Using a custom template means that you will have a more difficult time migrating to new versions of tsoa since your template interacts with the tsoa internals. So, to get the newest and best features of tsoa, please use one of provided templates by selecting your chosen `"middleware"` (i.e. "koa", "express", or "hapi") and by omitting `"middlewareTemplate"`. **END WARNING**

_Okay, but why would you want to override the route template?_

* Are you using a server framework that we don't yet support? If so, then [please open an issue first](https://github.com/lukeautry/tsoa/issues). It's likely that we will try to accept your custom template as one of the new standard options. If we can't support the new framework, then we'll recommend a custom route template.
* Do you have a very specific requirement? Have you already opened an issue and have the tsoa maintainers opted not to support this feature? Then a custom template might solve your needs best.

Route templates are generated from predefined handlebar templates. You can override and define your own template to use
by defining it in your tsoa.json configuration. Route paths are generated based on the middleware type you have defined.
```js
{
  "entryFile": "...",
  "spec": {
    ...
  },
  "routes": {
    "routesDir": "...",
    "middleware": "express",
    "middlewareTemplate": "custom-template.ts"
    ...
  }
}
```

### Consuming generated routes

You have two options for how to tell tsoa where it can find the controllers that it will use to create the auto-generated `routes.ts` file.

#### (1) Using automatic controllers discovery
You can tell `tsoa` to use your automatic controllers discovery by providing a [minimatch glob](http://www.globtester.com/) in the [config](https://github.com/lukeautry/tsoa/blob/master/src/config.ts) file (e.g. `tsoa.json`). It can be provided on `config.spec` or `config.routes`.

Pros:
  * New developers can add a controller without having to know how tsoa "crawls" for the controllers. As long as their controller is caught by the glob that you provide, the controller will be added to the OpenAPI documentation and to the auto-generated `routes.ts` file.
  
Cons:
  * It could be potentially slower (but not significantly slow) than the alternative option described further down in the readme.

As you can see from the the controllers globs patterns below, you can provide multiple globs of various patterns:
```js
{
  "entryFile": "...",
  "routes": {
    "routesDir": "...",
    "middleware": "...",
    "controllerPathGlobs": [
      "./dir-with-controllers/*",
      "./recursive-dir/**/*",
      "./custom-filerecursive-dir/**/*.controller.ts"
    ]
  }
}
```

#### (2) Manually telling tsoa which controllers to use in the app entry file
Tsoa can "crawl" the index file to look for controllers that have the `@Route` decorator.

Pros:
  * The tsoa route generation will be faster.
  
Cons:
  * New developers on your team might add a controller and not understand why the new controller was not exposed to the router or to the OpenAPI generation. If this is a problem for you, please us the automatic controller discovery option described above.

```typescript
import * as methodOverride from 'method-override';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import {RegisterRoutes} from './routes';

// ########################################################################
// controllers need to be referenced in order to get crawled by the generator
import './controllers/usersController';
// ########################################################################

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());

RegisterRoutes(app);

app.listen(3000);
```

### Get access to the request object of express (or koa) in Controllers

To access the request object of express in a controller method use the `@Request`-decorator:
```typescript
// controllers/usersController.ts

import * as express from 'express';
import {Get, Route, Request} from 'tsoa';
import {User, UserCreationRequest} from '../models/user';

@Route('Users')
export class UsersController {
  @Get('{id}')
  public async getUser(id: number, @Request() request: express.Request): Promise<User> {
    // TODO: implement some code that uses the request as well
  }
}
```

To access Koa's request object (which has the ctx object) in a controller method use the `@Request`-decorator:
```typescript
// controllers/usersController.ts

import * as koa from 'koa';
import {Get, Route, Request} from 'tsoa';
import {User, UserCreationRequest} from '../models/user';

@Route('Users')
export class UsersController {
  @Get('{id}')
  public async getUser(id: number, @Request() request: koa.Request): Promise<User> {
    const ctx = request.ctx;
      // TODO: implement some code that uses the request as well
  }
}
```

Note that the parameter `request` does not appear in your OAS file.
Likewise you can use the decorator `@Inject` to mark a parameter as being injected manually and should be omitted in Spec generation.
In this case you should write your own custom template where you inject the needed objects/values in the method-call.

### Dependency injection or IOC

By default all the controllers are created by the auto-generated routes template using an empty default constructor.
If you want to use dependency injection and let the DI-framework handle the creation of your controllers you can use [inversifyJS](https://github.com/inversify/InversifyJS) or [typescript-ioc](https://github.com/thiagobustamante/typescript-ioc)

#### InversifyJS


To tell `tsoa` to use your DI-container you have to reference your module exporting the DI-container in the [config](https://github.com/lukeautry/tsoa/blob/master/src/config.ts) file (e.g. `tsoa.json`):
The convention is that you have to name your inversify `Container` `iocContainer` and export it in the given module.
```js
{
  "entryFile": "...",
  "spec": {
    ...
  },
  "routes": {
    "routesDir": "...",
    "middleware": "...",
    "iocModule": "./inversify/ioc",
    ...
  }
}
```
Note that as of 1.1.1 the path is now relative to the your current working directory like the other paths.

Here is some example code to setup the container and your controller with inversify.js.

`./inversify/ioc.ts`:
```ts
import { Container, inject, interfaces } from 'inversify';
import { autoProvide, makeProvideDecorator, makeFluentProvideDecorator } from 'inversify-binding-decorators';

let iocContainer = new Container();

let provide = makeProvideDecorator(iocContainer);
let fluentProvider = makeFluentProvideDecorator(iocContainer);

let provideNamed = function(
  identifier: string | symbol | interfaces.Newable<any> | interfaces.Abstract<any>,
  name: string
) {
  return fluentProvider(identifier)
    .whenTargetNamed(name)
    .done();
};

let provideSingleton = function(
  identifier: string | symbol | interfaces.Newable<any> | interfaces.Abstract<any>
) {
  return fluentProvider(identifier)
    .inSingletonScope()
    .done();
};

export { iocContainer, autoProvide, provide, provideSingleton, provideNamed, inject };
```

`./controllers/fooController.ts`
```ts
import { Route } from 'tsoa';
import { provideSingleton, inject } from '../inversify/ioc';

@Route('foo')
@provideSingleton(FooController)
export class FooController {
  constructor(
    @inject(FooService) private fooService: FooService
  ) { }
  ...
}

@provideSingleton(FooService)
export class FooService {
  constructor(
    // maybe even more dependencies to be injected...
  )
}
```

#### typescript-ioc

Here is some example code to setup the controller with typescript-ioc.

`./controllers/fooController.ts`
```ts
import { Route } from 'tsoa';
import { Inject, Provides } from "typescript-ioc";

@Route('foo')
export class FooController {

  @Inject
  private fooService: FooService
  ...

}

@Provides(FooService)
export class FooService {

}
```

The controllers need to be included in the application in order to be linked.

`index.ts`
```ts
import "./controllers/fooController.ts"
...

```

### Specify error response types for OpenAPI

```ts
@Response('400', 'Bad request')
@Response<ErrorResponse>('default', 'Unexpected error')
@Get('Response')
public async getResponse(): Promise<TestModel> {
  return new ModelService().getModel();
}
```

For information on how to return a specific error [see this example](https://github.com/lukeautry/tsoa/issues/382).

### Authentication

Authentication is done using a middleware handler along with `@Security('name', ['scopes'])` decorator in your controller.

First, define the security definitions for OpenAPI, and also configure where the authentication middleware handler is. In this case, it is in the `authentication.ts` file.

```js
{
  "spec": {
    "securityDefinitions": {
        "api_key": {
            "type": "apiKey",
            "name": "access_token",
            "in": "query"
        },
        "tsoa_auth": {
            "type": "oauth2",
            "authorizationUrl": "http://swagger.io/api/oauth/dialog",
            "flow": "implicit",
            "scopes": {
                "write:pets": "modify things",
                "read:pets": "read things"
            }
        }
    },
    ...
  },
  "routes": {
    "authenticationModule": "./authentication.ts",
    ...
  }
}
```


In the middleware, export the function based on which library (Express, Koa, Hapi) you are using. You only create 1 function to handle all authenticate types. The `securityName` and `scopes` come from the annotation you put above your controller function.
`./authentication.ts`
```ts
import * as express from 'express';
import * as jwt from 'jsonwebtoken';

export function expressAuthentication(request: express.Request, securityName: string, scopes?: string[]): Promise<any> {
  if (securityName === 'api_token') {
    let token;
    if (request.query && request.query.access_token) {
      token = request.query.access_token;
    }

    if (token === 'abc123456') {
      return Promise.resolve({
        id: 1,
        name: 'Ironman'
      });
    } else {
      return Promise.reject({});
    }
  }

  if (securityName === 'jwt') {
    const token = request.body.token || request.query.token || request.headers['x-access-token'];

    return new Promise((resolve, reject) => {
      if (!token) {
        reject(new Error("No token provided"))
      }
      jwt.verify(token, "[secret]", function (err: any, decoded: any) {
        if (err) {
          reject(err)
        } else {
          // Check if JWT contains all required scopes
          for (let scope of scopes) {
            if (!decoded.scopes.includes(scope)) {
              reject(new Error("JWT does not contain required scope."));
            }
          }
          resolve(decoded)
        }
      });
    });
  }
};

import * as hapi from '@hapi/hapi';
export function hapiAuthentication(request: hapi.Request, securityName: string, scopes?: string[]): Promise<any> {
    // See above
}

import { Request } from 'koa';
export function koaAuthentication(request: Request, securityName: string, scopes?: string[]): Promise<any> {
    // See above
}
```
`./controllers/securityController.ts`
```ts
import { Get, Route, Security, Response } from 'tsoa';

@Route('secure')
export class SecureController {
  @Response<ErrorResponseModel>('Unexpected error')
  @Security('api_token')
  @Get("UserInfo")
  public async userInfo(@Request() request: any): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Security('jwt', ['admin'])
  @Get("EditUser")
  public async userInfo(@Request() request: any): Promise<string> {
    // Do something here
  }
}
```

### Path mapping

Per the [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/basic-types.html) under [module resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html):

> Sometimes modules are not directly located under baseUrl. For instance, an import to a module "jquery" would be translated at runtime to "node_modules\jquery\dist\jquery.slim.min.js". Loaders use a mapping configuration to map module names to files at run-time, see RequireJs documentation and SystemJS documentation.
>
>The TypeScript compiler supports the declaration of such mappings using "paths" property in tsconfig.json files. Here is an example for how to specify the "paths" property for jquery.
```js
{
  "compilerOptions": {
    "baseUrl": ".", // This must be specified if "paths" is.
    "paths": {
      "jquery": ["node_modules/jquery/dist/jquery"] // This mapping is relative to "baseUrl"
    }
  }
}
```

If you have a project that utilized this functionality, you can configure the internal generators to use the correct paths by providing a compilerOptions property to route configuration property in tsoa.json.

```js
{
  "spec": {
    ...
  },
  "routes": {
    ...
  },
   "compilerOptions": {
        "baseUrl": "./path/to/base/url",
        "paths": {
            "exampleLib": "./path/to/example/lib"
        }
    }
}
```

### Uploading files

This requires to have multer installed:

`npm install --save multer`

Inside a controller resource, call handleFile and pass the express Request to resolve 'file'. This also handles multipart/form-data. A quick sample:

```ts
import { Get, Route, Security, Response } from 'tsoa';
import * as express from 'express';
import * as multer from 'multer';

@Route('files')
export class FilesController {

  @Post('uploadFile')
  public async uploadFile(@Request() request: express.Request): Promise<any> {
    await this.handleFile(request);
    // file will be in request.randomFileIsHere, it is a buffer
    return {};
  }

  private handleFile(request: express.Request): Promise<any> {
    const multerSingle = multer().single('randomFileIsHere');
    return new Promise((resolve, reject) => {
      multerSingle(request, undefined, async (error) => {
        if (error) {
          reject(error);
        }
        resolve();
      });
    });
  }
}
```

The according OpenAPI definition can be merge-overwritten inside `tsoa.json`. Here is a quick sample, what the previous request should look like.

```js
{
  "spec": {
    ...
    "specMerging": "recursive",
    "spec": {
      "paths": {
        "/files/uploadFile": {
          "post": {
            "consumes": [
              "multipart/form-data"
            ],
            "parameters": [
              {
                "in": "formData",
                "name": "randomFileIsHere",
                "required": true,
                "type": "file"
              }
            ]
          }
        }
      }
    }
  },
  "routes": {
     ...
  }
}
```

### Tags

If you have a project that needs a description and/or external docs for tags, you can configure the internal generators to use the correct tags definitions and external docs by providing a tags property to spec property in tsoa.json.

```js
{
  "spec": {
    "tags":  [
      {
        "name": "User",
        "description": "Operations about users",
        "externalDocs": {
          "description": "Find out more about users",
          "url": "http://swagger.io"
        }
      }
    ],
    ...
  },
  "routes": {
    ...
  }
}
```

### Using awesome OpenAPI tools

Now that you have a OpenAPI Specification (OAS) (swagger.json), you can use all kinds of amazing tools that [generate documentation, client SDKs, and more](http://openapi.tools//).

## Decorators

### Security

The `Security` decorator can be used above controller methods to indicate that there should be authentication before running those methods. As described above, the authentication is done in a file that's referenced in tsoa's configuration. When using the `Security` decorator, you can choose between having one or multiple authentication methods. If you choose to have multiple authentication methods, you can choose between having to pass one of the methods (OR):

```ts
@Security('tsoa_auth', ['write:pets', 'read:pets'])
@Security('api_key')
@Get('OauthOrAPIkey')
public async GetWithOrSecurity(@Request() request: express.Request): Promise<any> {
}
```

or having to pass all of them (AND):

```ts
@Security({
  tsoa_auth: ['write:pets', 'read:pets'],
  api_key: [],
})
@Get('OauthAndAPIkey')
public async GetWithAndSecurity(@Request() request: express.Request): Promise<any> {
}
```

### Tags

Tags are defined with the `@Tags('tag1', 'tag2', ...)` decorator in the controllers and/or in the methods like in the following examples.

```ts
import { Get, Route, Response, Tags } from 'tsoa';

@Route('user')
@Tags('User')
export class UserController {
  @Response<ErrorResponseModel>('Unexpected error')
  @Get('UserInfo')
  @Tags('Info', 'Get')
  public async userInfo(@Request() request: any): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Get('EditUser')
  @Tags('Edit')
  public async userInfo(@Request() request: any): Promise<string> {
    // Do something here
  }
}
```

### OperationId

Set operationId parameter under operation's path.
Useful for use with OpenAPI code generation tool since this parameter is used to name the function generated in the client SDK.

```ts
@Get()
@OperationId('findDomain')
public async find(): Promise<any> {

}
```

### Deprecated

Declares this endpoint to be deprecated. Useful for when you are migrating endpoints and wants to keep a outdated
version live until all consumers migrate to use the new endpoint version.

```ts
@Get()
@Deprecated()
public async find(): Promise<any> {

}
```

### Hidden

Excludes this endpoint from the generated OpenAPI Specification document.

```ts
  @Get()
  @Hidden()
  public async find(): Promise<any> {

  }
```

It can also be set at the controller level to exclude all of its endpoints from the OpenAPI Specification document.

```ts
@Hidden()
export class HiddenController {
  @Get()
  public async find(): Promise<any> {

  }

  @Post()
  public async create(): Promise<any> {

  }
}
```

## Command Line Interface

For information on the configuration object (tsoa.json), check out the following:

[Configuration definition](./src/config.ts)

[Configuration sample](./tsoa.json)

### OpenAPI Specification (OAS) generation

```
Usage: tsoa spec [options]

Options:
   --configuration, -c  tsoa configuration file; default is tsoa.json in the working directory  [string]
   --host  API host                                                                             [string]
   --basePath  Base API path                                                                    [string]
```

### Route generation

```
Usage: tsoa routes [options]

Options:
  --configuration, -c  tsoa configuration file; default is tsoa.json in the working directory   [string]
  --basePath  Base API path                                                                     [string]
```


## Examples

[An example project with tsoa implementation and client library generation/React integration is available here](https://github.com/lukeautry/ts-app)

See example controllers in [the tests](tests/fixtures/controllers)

## Help wanted

### Contributing code

To contribute (via a PR), please first see the [Contributing Guide](https://github.com/lukeautry/tsoa/tree/master/docs/CONTRIBUTING.md)

### Becoming a maintainer

tsoa wants additional maintainers! The library has increased in popularity and has quite a lot of pull requests and issues. [Please post in this issue](https://github.com/lukeautry/tsoa/issues/236) if you're willing to take on the role of a maintainer.
