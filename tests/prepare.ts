/* eslint-disable no-console */
import * as os from 'os';
import * as chalk from 'chalk';
import { generateSpecAndRoutes, generateRoutes } from '@tsoa/cli';
import { Timer } from './utils/timer';

const spec = async () => {
  const result = await generateSpecAndRoutes({
    configuration: 'tsoa.json',
  });
  return result;
};

const log = async <T>(label: string, fn: () => Promise<T>) => {
  console.log(chalk.dim(chalk.green(`↻ Starting ${label}...`)));
  const timer = new Timer();

  const result = await fn();
  console.log(chalk.green(`✓ Finished ${label} in ${timer.elapsed()}ms`));

  return result;
};

(async () => {
  const metadata = await log('Swagger Spec Generation', spec);

  await Promise.all([
    log('Express Route Generation', () =>
      generateRoutes(
        {
          noImplicitAdditionalProperties: 'silently-remove-extras',
          authenticationModule: './fixtures/express/authentication.ts',
          basePath: '/v1',
          entryFile: './fixtures/express/server.ts',
          middleware: 'express',
          routesDir: './fixtures/express',
        },
        undefined,
        undefined,
        metadata,
      ),
    ),
    log('Express Router Route Generation', () =>
      generateRoutes(
        {
          noImplicitAdditionalProperties: 'silently-remove-extras',
          authenticationModule: './fixtures/express-router/authentication.ts',
          entryFile: './fixtures/express-router/server.ts',
          middleware: 'express',
          routesDir: './fixtures/express-router',
        },
        undefined,
        undefined,
        metadata,
      ),
    ),
    log('Express Route Generation, OpenAPI3, noImplicitAdditionalProperties', () =>
      generateRoutes(
        {
          noImplicitAdditionalProperties: 'throw-on-extras',
          authenticationModule: './fixtures/express-openapi3/authentication.ts',
          basePath: '/v1',
          entryFile: './fixtures/server.ts',
          middleware: 'express',
          routesDir: './fixtures/express-openapi3',
        },
        undefined,
        undefined,
        metadata,
      ),
    ),
    log('Express Dynamic Route Generation', () =>
      generateRoutes(
        {
          noImplicitAdditionalProperties: 'silently-remove-extras',
          authenticationModule: './fixtures/express/authentication.ts',
          basePath: '/v1',
          controllerPathGlobs: ['./fixtures/controllers/*'],
          entryFile: './fixtures/express-dynamic-controllers/server.ts',
          middleware: 'express',
          routesDir: './fixtures/express-dynamic-controllers',
        },
        undefined,
        undefined,
        metadata,
      ),
    ),
    log('Express Route Generation, rootSecurity', () =>
      generateRoutes({
        noImplicitAdditionalProperties: 'silently-remove-extras',
        authenticationModule: './fixtures/express/authentication.ts',
        basePath: '/v1',
        entryFile: './fixtures/express-root-security/server.ts',
        middleware: 'express',
        routesDir: './fixtures/express-root-security',
        rootSecurity: [{ api_key: [] }],
      }),
    ),
    log('Koa Route Generation', () =>
      generateRoutes({
        noImplicitAdditionalProperties: 'silently-remove-extras',
        authenticationModule: './fixtures/koa/authentication.ts',
        basePath: '/v1',
        entryFile: './fixtures/koa/server.ts',
        middleware: 'koa',
        routesDir: './fixtures/koa',
      }),
    ),

    log('Koa Route Generation (with multerOpts)', () =>
      generateRoutes({
        noImplicitAdditionalProperties: 'silently-remove-extras',
        basePath: '/v1',
        entryFile: './fixtures/koa-multer-options/server.ts',
        middleware: 'koa',
        routesDir: './fixtures/koa-multer-options',
        multerOpts: {
          dest: os.tmpdir(),
        },
      }),
    ),
    log('Koa Route Generation (but noImplicitAdditionalProperties is set to "throw-on-extras")', () =>
      generateRoutes({
        noImplicitAdditionalProperties: 'throw-on-extras',
        authenticationModule: './fixtures/koaNoAdditional/authentication.ts',
        basePath: '/v1',
        entryFile: './fixtures/koaNoAdditional/server.ts',
        middleware: 'koa',
        routesDir: './fixtures/koaNoAdditional',
      }),
    ),
    log('Hapi Route Generation', () =>
      generateRoutes({
        noImplicitAdditionalProperties: 'silently-remove-extras',
        authenticationModule: './fixtures/hapi/authentication.ts',
        basePath: '/v1',
        entryFile: './fixtures/hapi/server.ts',
        middleware: 'hapi',
        routesDir: './fixtures/hapi',
      }),
    ),
    log('Custom Route Generation', () =>
      generateRoutes(
        {
          noImplicitAdditionalProperties: 'silently-remove-extras',
          authenticationModule: './fixtures/custom/authentication.ts',
          basePath: '/v1',
          entryFile: './fixtures/custom/server.ts',
          middleware: 'express',
          middlewareTemplate: './fixtures/custom/custom-tsoa-template.ts.hbs',
          routesDir: './fixtures/custom',
          routesFileName: 'customRoutes.ts',
        },
        undefined,
        undefined,
        metadata,
      ),
    ),
    log('Inversify Route Generation', () =>
      generateRoutes({
        noImplicitAdditionalProperties: 'silently-remove-extras',
        authenticationModule: './fixtures/inversify/authentication.ts',
        basePath: '/v1',
        entryFile: './fixtures/inversify/server.ts',
        iocModule: './fixtures/inversify/ioc.ts',
        middleware: 'express',
        routesDir: './fixtures/inversify',
      }),
    ),
    log('Inversify(-binding-decorators) with ControllerPathGlob Route Generation', () =>
      generateRoutes({
        controllerPathGlobs: ['fixtures/inversify-cpg/*Controller.ts'],
        noImplicitAdditionalProperties: 'silently-remove-extras',
        authenticationModule: './fixtures/inversify-cpg/authentication.ts',
        basePath: '/v1',
        entryFile: '',
        iocModule: './fixtures/inversify-cpg/ioc.ts',
        middleware: 'express',
        routesDir: './fixtures/inversify-cpg',
      }),
    ),
    log('Inversify Route Generation using dynamic container creation', () =>
      generateRoutes({
        noImplicitAdditionalProperties: 'silently-remove-extras',
        authenticationModule: './fixtures/inversify-dynamic-container/authentication.ts',
        basePath: '/v1',
        entryFile: './fixtures/inversify-dynamic-container/server.ts',
        iocModule: './fixtures/inversify-dynamic-container/ioc.ts',
        middleware: 'express',
        routesDir: './fixtures/inversify-dynamic-container',
      }),
    ),
    log('Inversify Async IoC Route Generation', () =>
      generateRoutes({
        noImplicitAdditionalProperties: 'silently-remove-extras',
        basePath: '/v1',
        entryFile: './fixtures/inversify-async/server.ts',
        iocModule: './fixtures/inversify-async/ioc.ts',
        middleware: 'express',
        routesDir: './fixtures/inversify-async',
      }),
    ),
    log('Serverless Route Generation', () =>
      generateRoutes({
        noImplicitAdditionalProperties: 'silently-remove-extras',
        basePath: '/v1',
        entryFile: './fixtures/custom/server.ts',
        routesDir: './fixtures/custom/custom-route-generator/routes',
        routeGenerator: './fixtures/custom/custom-route-generator/serverlessRouteGenerator',
        modelsTemplate: './fixtures/custom/custom-route-generator/templates/models.hbs',
        handlerTemplate: './fixtures/custom/custom-route-generator/templates/handler.hbs',
        stackTemplate: './fixtures/custom/custom-route-generator/templates/api-stack.hbs',
      }),
    ),
  ]);
})();
