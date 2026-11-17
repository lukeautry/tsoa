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
  - Express (4 and 5), Hapi, Koa, and Fastify currently supported, other middleware can be supported using a simple handlebars template
  - Validate request payloads

## Philosophy

- Rely on TypeScript type annotations to generate API metadata if possible
- If regular type annotations aren't an appropriate way to express metadata, use decorators
- Use jsdoc for pure text metadata (e.g. endpoint descriptions)
- Minimize boilerplate
- Models are best represented by interfaces (pure data structures), but can also be represented by classes
- Runtime validation of tsoa should behave as closely as possible to the specifications that the generated OpenAPI 2/3 schema describes. Any differences in validation logic are clarified by logging warnings during the generation of the OpenAPI Specification (OAS) and/or the routes.
  - Please note that by enabling OpenAPI 3 you minimize the chances of divergent validation logic since OpenAPI 3 has a more expressive schema syntax.

## Requirements

- Node.js 22.12 or later, 24 or 26
- TypeScript 5.7 or later, or TypeScript 6

## Getting Started

- [Documentation](https://tsoa-community.github.io/docs/)
- [API Reference](https://tsoa-community.github.io/reference/)
- [Getting started guide](https://tsoa-community.github.io/docs/getting-started)

### Fastify

Install `fastify` and set `routes.middleware` to `"fastify"` in `tsoa.json`.
If your controllers use `@FormField`, `@UploadedFile`, or `@UploadedFiles`, also install `@fastify/multipart@^9`.

Register `RegisterRoutes` with plain `app.register`; wrapping it in `fastify-plugin` removes the isolation and the prefix, and an enclosing multipart registration is rejected at startup.

Register the generated routes as a plugin:

```ts
import Fastify from 'fastify';
import { RegisterRoutes } from './routes';

const app = Fastify();
app.register(RegisterRoutes);
await app.listen({ port: 3000 });
```

Pass a `prefix` or `multipart` options object as the second argument to `app.register` to configure the plugin:

```ts
app.register(RegisterRoutes, {
  multipart: { limits: { fileSize: 20 * 1024 * 1024, files: 5 } },
});
```

Your multipart limits override the defaults, including the 8 MiB file limit. tsoa forces `attachFieldsToBody: false` because it collects the parts itself.

The authentication module exports `fastifyAuthentication(request, securityName, scopes?, reply?)` and returns a promise, like Koa authentication.
Use native Fastify preHandler hooks with `@Middlewares<preHandlerHookHandler>(...)`.

Uploads are kept in memory; there is no disk storage option.
Raw binary request streams bypass Fastify's `bodyLimit`, as they do in Koa.
`@Produces` does not set response headers at runtime, as in Koa and Hapi.

## Examples

Check out the [guides](https://tsoa-community.github.io/docs/getting-started)

See example controllers in [the tests](tests/fixtures/controllers)

See example models in [the tests](tests/fixtures/testModel.ts)

## Help wanted

### Contributing code

To contribute (via a PR), please first see the [Contributing Guide](https://github.com/lukeautry/tsoa/tree/master/docs/CONTRIBUTING.md)

### Becoming a maintainer

tsoa wants additional maintainers! The library has increased in popularity and has quite a lot of pull requests and issues. [Please post in this issue](https://github.com/lukeautry/tsoa/issues/236) if you're willing to take on the role of a maintainer.
