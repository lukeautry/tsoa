#!/usr/bin/env node
import { MetadataGenerator } from './metadataGeneration/metadataGenerator';
import { SpecGenerator } from './swagger/specGenerator';
import { RouteGenerator } from './routeGeneration/routeGenerator';
import * as yargs from 'yargs';

const appRoot: string = require('app-root-path').path;

const entryFileConfig = {
  alias: 'e',
  describe: 'Server entry point; this should be your top level file, e.g. server.ts/app.ts',
  required: true,
  type: 'string'
};

const versionDefault = getPackageJsonValue('version');
const nameDefault = getPackageJsonValue('name');
const descriptionDefault = getPackageJsonValue('description');
const licenseDefault = getPackageJsonValue('license');

yargs
  .usage('Usage: $0 <command> [options]')
  .demand(1)

  .command('swagger', 'Generate swagger spec', {
    'entry-file': entryFileConfig,
    'swagger-dir': {
      alias: 's',
      describe: 'Swagger directory; generated swagger.json will be dropped here',
      required: true,
      type: 'string'
    },
    'host': {
      alias: 'ho',
      describe: 'API host, e.g. localhost:3000 or https://myapi.com',
      required: false,
      type: 'string'
    },
    'ver': {
      alias: 'v',
      default: versionDefault,
      describe: 'API version number; defaults to npm package version',
      required: !versionDefault,
      type: 'string'
    },
    'name': {
      alias: 'n',
      default: nameDefault,
      describe: 'API name; defaults to npm package name',
      required: !nameDefault,
      type: 'string'
    },
    'description': {
      alias: 'd',
      default: descriptionDefault,
      describe: 'API description; defaults to npm package description',
      required: !descriptionDefault,
      type: 'string'
    },
    'license': {
      alias: 'l',
      default: licenseDefault,
      describe: 'API license; defaults to npm package license',
      required: !licenseDefault,
      type: 'string'
    },
    'basePath': {
      alias: 'b',
      default: '/',
      describe: 'Base API path; e.g. the \'/v1\' in https://myapi.com/v1',
      type: 'string'
    }
  }, (args: SwaggerArgs) => {
    const metadata = new MetadataGenerator(args.entryFile).Generate();
    new SpecGenerator(metadata, {
      basePath: args.basePath,
      description: args.description,
      host: args.host,
      license: args.license,
      name: args.name,
      version: args.ver,
    }).GenerateJson(args.swaggerDir);
  })

  .command('routes', 'Generate routes', {
    basePath: {
      alias: 'b',
      default: '/',
      description: 'Base API path; e.g. the \'/v1\' in https://myapi.com/v1'
    },
    'entry-file': entryFileConfig,
    'routes-dir': {
      alias: 'r',
      describe: 'Routes directory; generated routes.ts (which contains the generated code wiring up routes using middleware of choice) will be dropped here',
      required: true,
      type: 'string'
    },
    middleware: {
      alias: 'm',
      choices: ['express'],
      default: 'express',
      describe: 'Middleware provider',
      type: 'string',
    }
  }, (args: RoutesArgs) => {
    const metadata = new MetadataGenerator(args.entryFile).Generate();
    const routeGenerator = new RouteGenerator(metadata, {
      basePath: args.basePath,
      routeDir: args.routesDir
    });

    switch (args.middleware) {
      case 'express':
        routeGenerator.GenerateExpressRoutes();
        break;
      default:
        routeGenerator.GenerateExpressRoutes();
    }
  })

  .help('help')
  .alias('help', 'h')
  .argv;

function getPackageJsonValue(key: string): string {
  try {
    const packageJson = require(`${appRoot}/package.json`);
    return packageJson[key] || '';
  } catch (err) {
    return '';
  }
}

interface SwaggerArgs extends yargs.Argv {
  entryFile: string;
  swaggerDir: string;
  host: string;
  name: string;
  ver: string;
  description: string;
  basePath: string;
  license: string;
}

interface RoutesArgs extends yargs.Argv {
  entryFile: string;
  routesDir: string;
  middleware: string;
  basePath: string;
}
