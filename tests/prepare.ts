// tslint:disable:no-console
import chalk from 'chalk';
import { generateSwaggerAndRoutes } from '../src/cli';
import { generateRoutes } from '../src/module/generate-routes';
import { Timer } from './utils/timer';

const spec = async () => {
  const result = await generateSwaggerAndRoutes({
    configuration: 'tsoa.json',
  });
  return result[0];
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
          authenticationModule: './tests/fixtures/express/authentication.ts',
          basePath: '/v1',
          entryFile: './tests/fixtures/express/server.ts',
          middleware: 'express',
          routesDir: './tests/fixtures/express',
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
          authenticationModule: './tests/fixtures/express-openapi3/authentication.ts',
          basePath: '/v1',
          entryFile: './tests/fixtures/server.ts',
          middleware: 'express',
          routesDir: './tests/fixtures/express-openapi3',
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
          authenticationModule: './tests/fixtures/express/authentication.ts',
          basePath: '/v1',
          controllerPathGlobs: ['./tests/fixtures/controllers/*'],
          entryFile: './tests/fixtures/express-dynamic-controllers/server.ts',
          middleware: 'express',
          routesDir: './tests/fixtures/express-dynamic-controllers',
        },
        undefined,
        undefined,
        metadata,
      ),
    ),
    log('Koa Route Generation', () =>
      generateRoutes(
        {
          noImplicitAdditionalProperties: 'silently-remove-extras',
          authenticationModule: './tests/fixtures/koa/authentication.ts',
          basePath: '/v1',
          entryFile: './tests/fixtures/koa/server.ts',
          middleware: 'koa',
          routesDir: './tests/fixtures/koa',
        },
        undefined,
        undefined,
        metadata,
      ),
    ),
    log('Koa Route Generation (but noImplicitAdditionalProperties is set to "throw-on-extras")', () =>
      generateRoutes(
        {
          noImplicitAdditionalProperties: 'throw-on-extras',
          authenticationModule: './tests/fixtures/koaNoAdditional/authentication.ts',
          basePath: '/v1',
          entryFile: './tests/fixtures/server.ts',
          middleware: 'koa',
          routesDir: './tests/fixtures/koaNoAdditional',
        },
        undefined,
        undefined,
        metadata,
      ),
    ),
    log('Hapi Route Generation', () =>
      generateRoutes({
        noImplicitAdditionalProperties: 'silently-remove-extras',
        authenticationModule: './tests/fixtures/hapi/authentication.ts',
        basePath: '/v1',
        entryFile: './tests/fixtures/hapi/server.ts',
        middleware: 'hapi',
        routesDir: './tests/fixtures/hapi',
      }),
    ),
    log('Custom Route Generation', () =>
      generateRoutes(
        {
          noImplicitAdditionalProperties: 'silently-remove-extras',
          authenticationModule: './tests/fixtures/custom/authentication.ts',
          basePath: '/v1',
          entryFile: './tests/fixtures/custom/server.ts',
          middleware: 'express',
          middlewareTemplate: './tests/fixtures/custom/custom-tsoa-template.ts.hbs',
          routesDir: './tests/fixtures/custom',
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
        authenticationModule: './tests/fixtures/inversify/authentication.ts',
        basePath: '/v1',
        entryFile: './tests/fixtures/inversify/server.ts',
        iocModule: './tests/fixtures/inversify/ioc.ts',
        middleware: 'express',
        routesDir: './tests/fixtures/inversify',
      }),
    ),
  ]);
})();
