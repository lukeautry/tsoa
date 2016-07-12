[ ![Codeship Status for lukeautry/tsoa](https://codeship.com/projects/cdce38d0-1f6b-0134-258e-1ed679ae6c9d/status?branch=master)](https://codeship.com/projects/160322)

## Goal

- TypeScript controllers and models as the single source of truth for your API
- A valid swagger spec is generated from your controllers and models, including:
    - Paths (e.g. GET /Users)
    - Definitions based on TypeScript interfaces (models)
    - Parameters/model properties marked as required or optional based on TypeScript (e.g. myProperty?: string is optional in the Swagger spec)
    - jsDoc supported for object descriptions (most other metadata can be inferred from TypeScript types)
- Routes are generated for middleware of choice
    - Express currently included, other middleware can be supported using a simple handlebars template

## Philosophy

- Rely on TypeScript type annotations to generate API metadata if possible
- If regular type annotations aren't an appropriate way to express metadata, use decorators
- Use jsdoc for pure text metadata (e.g. endpoint descriptions)
- Minimize boilerplate

## How it works

### Create Controllers

```typescript
// controllers/usersController.ts

import {Get, Route} from 'tsoa';
import {UserService} from '../services/userService';
import {User, UserCreationRequest} from '../models/user';

@Route('Users')
export class UsersController {
    @Get('{id})
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
swagger-ts-generate --entryFile=./src/server.ts --swaggerDir=./dist --routesDir=./src
```
- entryFile: Entry point for your application
- swaggerDir: Where you want swagger.json to be dropped
- routesDir: Where you want routes.ts to be dropped

### Consume generated routes

```typescript
import * as methodOverride from 'method-override';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import {RegisterRoutes} from './routes';

// controllers need to be referenced in order to get crawled by the generator
import './controllers/usersController';

app: express.Express = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());

RegisterRoutes(app);

app.listen(3000);

```

### Use awesome Swagger tools

Now that you have a swagger spec (swagger.json), you can use all kinds of amazing tools that generate documentation, client SDKs, and more.

## Installation

```
npm install tsoa --save
```