// tslint:disable:no-console
import chalk from 'chalk';
import { SwaggerConfig } from '../src/config';
import { generateRoutes } from '../src/module/generate-routes';
import { generateSwaggerSpec } from '../src/module/generate-swagger-spec';
import { Timer } from './utils/timer';

const defaultOptions: SwaggerConfig = {
    basePath: '/v1',
    entryFile: './tests/fixtures/express/server.ts',
    host: 'localhost:3000',
    noImplicitAdditionalProperties: 'silently-remove-extras',
    outputDirectory: './dist',
    securityDefinitions: {
      api_key: {
        in: 'query',
        name: 'access_token',
        type: 'apiKey',
      },
      tsoa_auth: {
        authorizationUrl: 'http://swagger.io/api/oauth/dialog',
        flow: 'implicit',
        scopes: {
          'read:pets': 'read things',
          'write:pets': 'modify things',
        },
        type: 'oauth2',
      },
    },
    yaml: true,
};
const optionsWithNoAdditional = Object.assign<{}, SwaggerConfig, Partial<SwaggerConfig>>({}, defaultOptions, {
  noImplicitAdditionalProperties: 'throw-on-extras',
  outputDirectory: './distForNoAdditional',
});

const spec = () => {
  return generateSwaggerSpec(defaultOptions);
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
    log('Express Route Generation', () => generateRoutes({
      authenticationModule: './tests/fixtures/express/authentication.ts',
      basePath: '/v1',
      entryFile: './tests/fixtures/express/server.ts',
      middleware: 'express',
      routesDir: './tests/fixtures/express',
    }, defaultOptions, undefined, undefined, metadata)),
    log('Express Dynamic Route Generation', () => generateRoutes({
      authenticationModule: './tests/fixtures/express/authentication.ts',
      basePath: '/v1',
      controllerPathGlobs: ['./tests/fixtures/controllers/*'],
      entryFile: './tests/fixtures/express-dynamic-controllers/server.ts',
      middleware: 'express',
      routesDir: './tests/fixtures/express-dynamic-controllers',
    }, defaultOptions, undefined, undefined, metadata)),
    log('Koa Route Generation', () => generateRoutes({
      authenticationModule: './tests/fixtures/koa/authentication.ts',
      basePath: '/v1',
      entryFile: './tests/fixtures/koa/server.ts',
      middleware: 'koa',
      routesDir: './tests/fixtures/koa',
    }, defaultOptions, undefined, undefined, metadata)),
    log('Koa Route Generation (but noImplicitAdditionalProperties is set to "throw-on-extras")', () => generateRoutes({
        authenticationModule: './tests/fixtures/koaNoAdditional/authentication.ts',
        basePath: '/v1',
        entryFile: './tests/fixtures/server.ts',
        middleware: 'koa',
        routesDir: './tests/fixtures/koaNoAdditional',
      }, optionsWithNoAdditional, undefined, undefined, metadata)),
    log('Hapi Route Generation', () => generateRoutes({
      authenticationModule: './tests/fixtures/hapi/authentication.ts',
      basePath: '/v1',
      entryFile: './tests/fixtures/hapi/server.ts',
      middleware: 'hapi',
      routesDir: './tests/fixtures/hapi',
    }, defaultOptions)),
    log('Custom Route Generation', () => generateRoutes({
      authenticationModule: './tests/fixtures/custom/authentication.ts',
      basePath: '/v1',
      entryFile: './tests/fixtures/custom/server.ts',
      middleware: 'express',
      middlewareTemplate: './tests/fixtures/custom/custom-tsoa-template.ts.hbs',
      routesDir: './tests/fixtures/custom',
    }, defaultOptions, undefined, undefined, metadata)),
    log('Inversify Route Generation', () => generateRoutes({
      authenticationModule: './tests/fixtures/inversify/authentication.ts',
      basePath: '/v1',
      entryFile: './tests/fixtures/inversify/server.ts',
      iocModule: './tests/fixtures/inversify/ioc.ts',
      middleware: 'express',
      routesDir: './tests/fixtures/inversify',
    }, defaultOptions)),
  ]);
})();
