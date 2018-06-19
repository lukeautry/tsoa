[![Codeship Status for lukeautry/tsoa](https://codeship.com/projects/cdce38d0-1f6b-0134-258e-1ed679ae6c9d/status?branch=master)](https://codeship.com/projects/160322)
[![npm version](https://badge.fury.io/js/tsoa.svg)](https://badge.fury.io/js/tsoa)

## Goal

- TypeScript controllers and models as the single source of truth for your API
- A valid swagger spec is generated from your controllers and models, including:
    - Paths (e.g. GET /Users)
    - Definitions based on TypeScript interfaces (models)
    - Parameters/model properties marked as required or optional based on TypeScript (e.g. myProperty?: string is optional in the Swagger spec)
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

## Looking for additional maintainers

tsoa wants additional maintainers! The library has increased in popularity and has quite a lot of pull requests and issues. [Please post in this issue](https://github.com/lukeautry/tsoa/issues/236) if you're willing to take on the role of a maintainer.

All merged changes that touch 'real' code should include unit tests and pass linting/type checking.

## How it works

## Installation

```sh
npm install tsoa --save
// OR
npm install lukeautry/tsoa#[VERSION]
```

### Create Controllers

```typescript
// controllers/usersController.ts

import {Get, Post, Route, Body, Query, Header, Path, SuccessResponse, Controller } from 'tsoa';
import {UserService} from '../services/userService';
import {User, UserCreationRequest} from '../models/user';

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

    @Get('{id}')
    public async getPrivateUser(@Path('id') ID: number, @Header('Authorization') authorization: string): Promise<User> {
        return new UserService().get(id);
    }
}
```
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

Note that type aliases are only supported for string literal types like `type status = 'Happy' | 'Sad'`

### Generate

From command line/npm script:
```
// generate swagger.json
tsoa swagger

// generate routes
tsoa routes
```

See [CLI documentation](#command-line-interface)

### Dealing with duplicate model names
If you have multiple models with the same name, you may get errors indicating that there are multiple matching models. If you'd like to designate a class/interface as the 'canonical' version of a model, add a jsdoc element marking it as such:

```
/**
 * @tsoaModel
 */
export interface MyModel {
    ...
}
```

### Override route template
Route templates are generated from predefined handlebar templates. You can override and define your own template to use
by defining it in your tsoa.json configuration. Route paths are generated based on the middleware type you have defined.
```
{
  "swagger": {
    ...
  },
  "routes": {
    "entryFile": "...",
    "routesDir": "...",
    "middleware": "express",
    "middlewareTemplate": "custom-template.ts"
    ...
  }
}
```

### Consume generated routes

```typescript
import * as methodOverride from 'method-override';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import {RegisterRoutes} from './routes';

// controllers need to be referenced in order to get crawled by the generator
import './controllers/usersController';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());

RegisterRoutes(app);

app.listen(3000);

```

### Get access to the request object of express in Controllers

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
        // TODO: implement some code that uses request as well
    }
}
```
Note that the parameter `request` does not appear in your swagger definition file. 
Likewise you can use the decorator `@Inject` to mark a parameter as being injected manually and should be omitted in swagger generation.
In this case you should write your own custom template where you inject the needed objects/values in the method-call. 

### Dependency injection / IOC

By default all the controllers are created by the auto-generated routes template using an empty default constructor.
If you want to use dependency injection and let the DI-framework handle the creation of your controllers you can use [inversifyJS](https://github.com/inversify/InversifyJS) or [typescript-ioc] (https://github.com/thiagobustamante/typescript-ioc)

#### Inversify.js


To tell `tsoa` to use your DI-container you have to reference your module exporting the DI-container in the config file (e.g. `tsoa.json`):
The convention is that you have to name your inversify `Container` `iocContainer` and export it in the given module.
```json
{
  "swagger": {
    ...
  },
  "routes": {
    "entryFile": "...",
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

`./contollers/fooController.ts`
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

`./contollers/fooController.ts`
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
import "./contollers/fooController.ts"
...

```

### Specify error response types for Swagger

```
@Response('400', 'Bad request')
@DefaultResponse<ErrorResponse>('Unexpected error')
@Get('Response')
public async getResponse(): Promise<TestModel> {
    return new ModelService().getModel();
}
```

### Authentication 

Authentication is done using a middleware handler along with `@Security('name', ['scopes'])` decorator in your controller.

First, define the security definitions for swagger, and also configure where the authentication middleware handler is. In this case, it is in the `authentication.ts` file.

```json
{
  "swagger": {
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

import * as hapi from 'hapi';
export function hapiAuthentication(request: hapi.Request, securityName: string, scopes?: string[]): Promise<any> {
    // See above
}

import { Request } from 'koa';
export function koaAuthentication(request: Request, securityName: string, scopes?: string[]): Promise<any> {
    // See above
}
```
`./contollers/securityController.ts`
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

### Path Mapping

Per the [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/basic-types.html) under [module resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html):

> Sometimes modules are not directly located under baseUrl. For instance, an import to a module "jquery" would be translated at runtime to "node_modules\jquery\dist\jquery.slim.min.js". Loaders use a mapping configuration to map module names to files at run-time, see RequireJs documentation and SystemJS documentation.
>
>The TypeScript compiler supports the declaration of such mappings using "paths" property in tsconfig.json files. Here is an example for how to specify the "paths" property for jquery.
```json
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

```json
{
  "swagger": {
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

### Upload files

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

The according swagger definition can be merge-overwritten inside `tsoa.json`. Here is a quick sample, what the previous request should look like.

```json
{
  "swagger": {
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

### Use awesome Swagger tools

Now that you have a swagger spec (swagger.json), you can use all kinds of amazing tools that [generate documentation, client SDKs, and more](http://swagger.io/).

## Command Line Interface

For information on the configuration object (tsoa.json), check out the following:

[Configuration definition](./src/config.ts)

[Configuration sample](./tsoa.json)

### Swagger.json generation

```
Usage: tsoa swagger [options]

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

[An example project is available here](https://github.com/lukeautry/tsoa-example)

Also see example controllers in [the tests](tests/fixtures/controllers)
