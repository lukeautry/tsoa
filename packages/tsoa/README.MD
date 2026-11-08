<div align="center">
  <a href="https://tsoa-community.github.io/docs/" target="blank">
    <h1>tsoa</h1>
  </a>
Pronounced so·uh

OpenAPI-compliant REST APIs using TypeScript and Node

![build status](https://github.com/lukeautry/tsoa/actions/workflows/runTestsOnPush.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/tsoa/latest)](https://www.npmjs.com/package/tsoa)

</div>

## Goal

- TypeScript controllers and models as the single source of truth for your API
- A valid OpenAPI (formerly Swagger) spec (2.0 or 3.0 if you choose 😍) is generated from your controllers and models, including:
  - Paths (e.g. GET /users)
  - Definitions based on TypeScript interfaces (models)
  - Parameters/model properties marked as required or optional based on TypeScript (e.g. myProperty?: string is optional in the OpenAPI spec)
  - jsDoc supported for object descriptions (most other metadata can be inferred from TypeScript types)
- Routes are generated for middleware of choice
  - Express (4 and 5), Hapi, and Koa currently supported, other middleware can be supported using a simple handlebars template
  - Validate request payloads

## Express 5

tsoa does not change its runtime for Express 5 defaults. Set these two options to keep query and form parsing the same as on Express 4:

```ts
app.set('query parser', 'extended'); // bracket syntax such as ?filter[a]=x and ?ids[]=1
app.use(express.urlencoded({ extended: true })); // nested form fields such as a[b]=1
```

- With `express.json()`, a request without a body leaves `req.body` `undefined` on Express 5, so a required `@Body()` fails validation. Express 4 and body-parser 1 leave `{}`, which passes if the body schema accepts an empty object.
- Express 5 reserves `()[]?+!` in route paths and requires a name for each `*` wildcard. A decorator path that breaks these rules fails at route registration. tsoa emits path parameters as `:name`. See the [Express 5 migration guide](https://expressjs.com/en/guide/migrating-5.html#path-route-matching-syntax).
- Express 5 forwards a rejected promise from an async custom `@Middlewares` function to the error handler. On Express 4, catch the error and call `next(err)`, or the unhandled rejection can stop the Node process.

## Philosophy

- Rely on TypeScript type annotations to generate API metadata if possible
- If regular type annotations aren't an appropriate way to express metadata, use decorators
- Use jsdoc for pure text metadata (e.g. endpoint descriptions)
- Minimize boilerplate
- Models are best represented by interfaces (pure data structures), but can also be represented by classes
- Runtime validation of tsoa should behave as closely as possible to the specifications that the generated OpenAPI 2/3 schema describes. Any differences in validation logic are clarified by logging warnings during the generation of the OpenAPI Specification (OAS) and/or the routes.
  - Please note that by enabling OpenAPI 3 you minimize the chances of divergent validation logic since OpenAPI 3 has a more expressive schema syntax.

## Framework packages

`@tsoa/runtime` does not install a web framework. Its framework packages are optional peer dependencies, so install the ones for the framework you use:

| Framework | Packages                             |
| --------- | ------------------------------------ |
| Express   | `express`, `@types/express` (4 or 5) |
| Koa       | `koa`, `@types/koa` (2 or 3)         |
| Hapi      | `@hapi/hapi`, `@hapi/boom`           |

Routes that accept file uploads also import `multer` (Express) or `@koa/multer` (Koa), so install that package as well. To change its options, pass your own instance: `RegisterRoutes(app, { multer: multer({ dest: '/tmp' }) })`. The generated routes otherwise use a default instance limited to 8 MB per file.

The generated Hapi routes import `boomify` and `isBoom` from `@hapi/boom`. `@hapi/hapi` depends on it, but list it in your own `package.json` as well: with pnpm or another strict layout, the routes cannot resolve it otherwise.

Each framework's template service has its own entry point. The `@tsoa/runtime` and `tsoa` roots do not export them, so custom route templates (`routes.middlewareTemplate`) and classes that extend a template service import them from the subpath:

```ts
import { ExpressTemplateService } from '@tsoa/runtime/express';
import { HapiTemplateService } from '@tsoa/runtime/hapi';
import { KoaTemplateService } from '@tsoa/runtime/koa';
```

## Getting Started

- [Documentation](https://tsoa-community.github.io/docs/)
- [API Reference](https://tsoa-community.github.io/reference/)
- [Getting started guide](https://tsoa-community.github.io/docs/getting-started)

## Examples

Check out the [guides](https://tsoa-community.github.io/docs/getting-started)

See example controllers in [the tests](tests/fixtures/controllers)

See example models in [the tests](tests/fixtures/testModel.ts)

## Help wanted

### Contributing code

To contribute (via a PR), please first see the [Contributing Guide](https://github.com/lukeautry/tsoa/tree/master/docs/CONTRIBUTING.md)

### Becoming a maintainer

tsoa wants additional maintainers! The library has increased in popularity and has quite a lot of pull requests and issues. [Please post in this issue](https://github.com/lukeautry/tsoa/issues/236) if you're willing to take on the role of a maintainer.
