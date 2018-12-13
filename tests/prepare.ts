// tslint:disable:no-console
import chalk from 'chalk';
import { generateRoutes } from '../src/module/generate-routes';
import { generateSwaggerSpec } from '../src/module/generate-swagger-spec';
import { Timer } from './utils/timer';

const spec = () => {
  return generateSwaggerSpec({
    basePath: '/v1',
    entryFile: './tests/fixtures/express/server.ts',
    host: 'localhost:3000',
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
  });
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
    }, undefined, undefined, metadata)),
    log('Koa Route Generation', () => generateRoutes({
      authenticationModule: './tests/fixtures/koa/authentication.ts',
      basePath: '/v1',
      entryFile: './tests/fixtures/koa/server.ts',
      middleware: 'koa',
      routesDir: './tests/fixtures/koa',
    }, undefined, undefined, metadata)),
    log('Hapi Route Generation', () => generateRoutes({
      authenticationModule: './tests/fixtures/hapi/authentication.ts',
      basePath: '/v1',
      entryFile: './tests/fixtures/hapi/server.ts',
      middleware: 'hapi',
      routesDir: './tests/fixtures/hapi',
    })),
    log('Custom Route Generation', () => generateRoutes({
      authenticationModule: './tests/fixtures/custom/authentication.ts',
      basePath: '/v1',
      entryFile: './tests/fixtures/custom/server.ts',
      middleware: 'express',
      middlewareTemplate: './tests/fixtures/custom/custom-tsoa-template.ts',
      routesDir: './tests/fixtures/custom',
    }, undefined, undefined, metadata)),
    log('Inversify Route Generation', () => generateRoutes({
      authenticationModule: './tests/fixtures/inversify/authentication.ts',
      basePath: '/v1',
      entryFile: './tests/fixtures/inversify/server.ts',
      iocModule: './tests/fixtures/inversify/ioc.ts',
      middleware: 'express',
      routesDir: './tests/fixtures/inversify',
    })),
  ]);
})();
