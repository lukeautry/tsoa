[![Codeship Status for lukeautry/tsoa](https://codeship.com/projects/cdce38d0-1f6b-0134-258e-1ed679ae6c9d/status?branch=master)](https://codeship.com/projects/160322)
[![Dependency Status](https://gemnasium.com/badges/github.com/lukeautry/tsoa.svg)](https://gemnasium.com/github.com/lukeautry/tsoa)
[![npm version](https://badge.fury.io/js/tsoa.svg)](https://badge.fury.io/js/tsoa)

## Goal

- TypeScript controllers and models as the single source of truth for your API
- A valid swagger spec is generated from your controllers and models, including:
    - Paths (e.g. GET /Users)
    - Definitions based on TypeScript interfaces (models)
    - Parameters/model properties marked as required or optional based on TypeScript (e.g. myProperty?: string is optional in the Swagger spec)
    - jsDoc supported for object descriptions (most other metadata can be inferred from TypeScript types)
- Routes are generated for middleware of choice
    - Express currently included, other middleware can be supported using a simple handlebars template
    - Validate request payloads

## Philosophy

- Rely on TypeScript type annotations to generate API metadata if possible
- If regular type annotations aren't an appropriate way to express metadata, use decorators
- Use jsdoc for pure text metadata (e.g. endpoint descriptions)
- Minimize boilerplate
- Models are always represented by interfaces; the contract between API client is best represented through a data structure, not a class or object

## How it works

### Create Controllers

```typescript
// controllers/usersController.ts

import {Get, Route} from 'tsoa';
import {UserService} from '../services/userService';
import {User, UserCreationRequest} from '../models/user';

@Route('Users')
export class UsersController {
    @Get('{id}')
    public async getUser(id: number): Promise<User> {
        return await new UserService().get(id);
    }

    @Post()
    public async createUser(request: UserCreationRequest): Promise<User> {
        return await new UserService().create(reqest);
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
    status?: string;
    phoneNumbers: string[];
}

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

### Generate!

From command line/npm script:
```
// generate swagger.json
tsoa swagger --entryFile=./src/server.ts --swaggerDir=./dist

// generate routes
tsoa routes --entryFile=./src/server.ts --routesDir=./src
```

See [CLI documentation](#command-line-interface)

### Consume generated routes

```typescript
import * as methodOverride from 'method-override';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import {RegisterRoutes} from './routes';

// controllers need to be referenced in order to get crawled by the generator
import './controllers/usersController';

const app: express.Express = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());

RegisterRoutes(app);

app.listen(3000);

```

### Use awesome Swagger tools

Now that you have a swagger spec (swagger.json), you can use all kinds of amazing tools that [generate documentation, client SDKs, and more](http://swagger.io/).

## Installation

```
npm install tsoa --save
```

## Command Line Interface

### Swagger.json generation

```
Usage: tsoa swagger [options]

Options:
  --entry-file, -e   Server entry point; this should be your top level file,
                     e.g. server.ts/app.ts                   [string] [required]
  --swagger-dir, -s  Swagger directory; generated swagger.json will be dropped
                     here                                    [string] [required]
  --host, --ho       API host, e.g. localhost:3000 or https://myapi.com/v1
                                                             [string] [required]
  --ver, -v          API version number; defaults to npm package version[string]
  --name, -n         API name; defaults to npm package name             [string]
  --description, -d  API description; defaults to npm package description
  --license, -l      API license; defaults to npm package license
  --basePath, -b     Base API path; e.g. the 'v1' in https://myapi.com/v1 [default: "/"]
```

### Route generation

```
Usage: tsoa routes [options]

Options:
  --entry-file, -e  Server entry point; this should be your top level file, e.g.
                    server.ts/app.ts                         [string] [required]
  --routes-dir, -r  Routes directory; generated routes.ts (which contains the
                    generated code wiring up routes using middleware of choice)
                    will be dropped here                     [string] [required]
  --middleware, -m  Middleware provider                        [string] [choices: "express"] [default: "express"]               
```

## Examples

[An example project is available here](https://github.com/lukeautry/tsoa-example)