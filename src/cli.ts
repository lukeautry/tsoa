#!/usr/bin/env node
/* tslint:disable:no-console */
import { Config, SwaggerConfig, RoutesConfig } from './config';
import { MetadataGenerator } from './metadataGeneration/metadataGenerator';
import { SpecGenerator } from './swagger/specGenerator';
import { RouteGenerator } from './routeGeneration/routeGenerator';
import * as yargs from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import * as PrettyError from 'pretty-error';

const workingDir: string = process.cwd();
const pe = new PrettyError();

const getPackageJsonValue = (key: string): string => {
  try {
    const packageJson = require(`${workingDir}/package.json`);
    return packageJson[key] || '';
  } catch (err) {
    return '';
  }
};

const versionDefault = getPackageJsonValue('version');
const nameDefault = getPackageJsonValue('name');
const descriptionDefault = getPackageJsonValue('description');
const licenseDefault = getPackageJsonValue('license');

const getConfig = (configPath = 'tsoa.json'): Config => {
  let config: Config;
  try {
    config = require(`${workingDir}/${configPath}`);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw Error(`No config file found at '${configPath}'`);
    } else if (err.name === 'SyntaxError') {
      throw Error(`Invalid JSON syntax in config at '${configPath}': ${err.message}`);
    } else {
      throw Error(`Unhandled error encountered loading '${configPath}': ${err.message}`);
    }
  }

  return config;
};

const validateSwaggerConfig = (config: SwaggerConfig): SwaggerConfig => {
  if (!config.outputDirectory) { throw new Error('Missing outputDirectory: onfiguration most contain output directory'); }
  if (!config.entryFile) { throw new Error('Missing entryFile: Configuration must contain an entry point file.'); }
  config.version = config.version || versionDefault;
  config.name = config.name || nameDefault;
  config.description = config.description || descriptionDefault;
  config.license = config.license || licenseDefault;
  config.basePath = config.basePath || '/';

  return config;
};

const validateRoutesConfig = (config: RoutesConfig): RoutesConfig => {
  if (!config.entryFile) { throw new Error('Missing entryFile: Configuration must contain an entry point file.'); }
  if (!config.routesDir) { throw new Error('Missing routesDir: Configuration must contain a routes file output directory.'); }

  if (config.authenticationModule && !(fs.existsSync(config.authenticationModule) || fs.existsSync(config.authenticationModule + '.ts'))) {
    throw new Error(`No authenticationModule file found at '${config.authenticationModule}'`);
  }

  if (config.iocModule && !(fs.existsSync(config.iocModule) || fs.existsSync(config.iocModule + '.ts'))) {
    throw new Error(`No iocModule file found at '${config.iocModule}'`);
  }

  config.basePath = config.basePath || '/';
  config.compilerOptions = config.compilerOptions || {};
  config.middleware = config.middleware || 'express';

  return config;
};

const configurationArgs = {
  alias: 'c',
  describe: 'tsoa configuration file; default is tsoa.json in the working directory',
  required: false,
  type: 'string'
};

const hostArgs = {
  describe: 'API host',
  required: false,
  type: 'string'
};

const basePathArgs = {
  describe: 'Base API path',
  required: false,
  type: 'string'
};

yargs
  .usage('Usage: $0 <command> [options]')
  .demand(1)

  .command('swagger', 'Generate swagger spec', {
    basePath: basePathArgs as any,
    configuration: configurationArgs as any,
    host: hostArgs as any
  }, (args: CommandLineArgs) => {
    try {
      const config = getConfig(args.configuration);
      if (args.basePath) {
        config.swagger.basePath = args.basePath;
      }
      if (args.host) {
        config.swagger.host = args.host;
      }

      const swaggerConfig = validateSwaggerConfig(config.swagger);
      const metadata = new MetadataGenerator(swaggerConfig.entryFile).Generate();
      new SpecGenerator(metadata, config.swagger).GenerateJson(swaggerConfig.outputDirectory);

      // tslint:disable-next-line:no-console
      console.info('Generate swagger successful.');
    } catch (err) {
      console.error('Generate swagger error.\n', pe.render(err));
    }
  })

  .command('routes', 'Generate routes', {
    basePath: basePathArgs as any,
    configuration: configurationArgs as any
  }, (args: CommandLineArgs) => {
    try {
      const config = getConfig(args.configuration);
      if (args.basePath) {
        config.routes.basePath = args.basePath;
      }

      const routesConfig = validateRoutesConfig(config.routes);
      const metadata = new MetadataGenerator(routesConfig.entryFile, routesConfig.compilerOptions).Generate();
      const routeGenerator = new RouteGenerator(metadata, routesConfig);

      let pathTransformer;
      let template;
      pathTransformer = (path: string) => path.replace(/{/g, ':').replace(/}/g, '');

      switch (routesConfig.middleware) {
        case 'express':
          template = path.join(__dirname, 'routeGeneration/templates/express.ts');
          break;
        case 'hapi':
          template = path.join(__dirname, 'routeGeneration/templates/hapi.ts');
          pathTransformer = (path: string) => path;
          break;
        case 'koa':
          template = path.join(__dirname, 'routeGeneration/templates/koa.ts');
          break;
        default:
          template = path.join(__dirname, 'routeGeneration/templates/express.ts');
      }

      if (routesConfig.middlewareTemplate) {
        template = routesConfig.middlewareTemplate;
      }

      routeGenerator.GenerateCustomRoutes(template, pathTransformer);
      // tslint:disable-next-line:no-console
      console.info('Generate routes successful.');
    } catch (err) {
      console.error('Generate routes error.\n', pe.render(err));
    }
  })

  .help('help')
  .alias('help', 'h')
  .argv;

interface CommandLineArgs extends yargs.Argv {
  basePath: string;
  configuration: string;
  host: string;
}
