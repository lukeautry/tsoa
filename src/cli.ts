#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as YAML from 'yamljs';
import * as yargs from 'yargs';
import { Config, RoutesConfig, SwaggerConfig } from './config';
import { MetadataGenerator } from './metadataGeneration/metadataGenerator';
import { RouteGenerator } from './routeGeneration/routeGenerator';
import { SpecGenerator } from './swagger/specGenerator';

const workingDir: string = process.cwd();

const getPackageJsonValue = (key: string, defaultValue = ''): string => {
  try {
    const packageJson = require(`${workingDir}/package.json`);
    return packageJson[key] || '';
  } catch (err) {
    return defaultValue;
  }
};

const nameDefault = getPackageJsonValue('name', 'TSOA');
const versionDefault = getPackageJsonValue('version', '1.0.0');
const descriptionDefault = getPackageJsonValue('description', 'Build swagger-compliant REST APIs using TypeScript and Node');
const licenseDefault = getPackageJsonValue('license', 'MIT');

const getConfig = (configPath = 'tsoa.json'): Config => {
  let config: Config;
  try {
    const ext = path.extname(configPath);
    if (ext === '.yaml' || ext === '.yml') {
      config = YAML.load(configPath);
    } else {
      config = require(`${workingDir}/${configPath}`);
    }

  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw Error(`No config file found at '${configPath}'`);
    } else if (err.name === 'SyntaxError') {
      // tslint:disable-next-line:no-console
      console.error(err);
      throw Error(`Invalid JSON syntax in config at '${configPath}': ${err.message}`);
    } else {
      // tslint:disable-next-line:no-console
      console.error(err);
      throw Error(`Unhandled error encountered loading '${configPath}': ${err.message}`);
    }
  }

  return config;
};

const validateCompilerOptions = (config?: ts.CompilerOptions): ts.CompilerOptions => {
  return config || {};
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
  config.middleware = config.middleware || 'express';

  return config;
};

const configurationArgs: yargs.Options = {
  alias: 'c',
  describe: 'tsoa configuration file; default is tsoa.json in the working directory',
  required: false,
  type: 'string',
};

const hostArgs: yargs.Options = {
  describe: 'API host',
  required: false,
  type: 'string',
};

const basePathArgs: yargs.Options = {
  describe: 'Base API path',
  required: false,
  type: 'string',
};

const yarmlArgs: yargs.Options = {
  describe: 'Swagger spec yaml format',
  required: false,
  type: 'boolean',
};

const jsonArgs: yargs.Options = {
  describe: 'Swagger spec json format',
  required: false,
  type: 'boolean',
};

yargs
  .usage('Usage: $0 <command> [options]')
  .demand(1)
  .command('swagger', 'Generate swagger spec', {
    basePath: basePathArgs,
    configuration: configurationArgs,
    host: hostArgs,
    json: jsonArgs,
    yaml: yarmlArgs,
  }, swaggerSpecGenerator)
  .command('routes', 'Generate routes', {
    basePath: basePathArgs,
    configuration: configurationArgs,
  }, routeGenerator)
  .help('help')
  .alias('help', 'h')
  .version(() => getPackageJsonValue('version'))
  .argv;

function swaggerSpecGenerator(args) {
  try {
    const config = getConfig(args.configuration);
    if (args.basePath) {
      config.swagger.basePath = args.basePath;
    }
    if (args.host) {
      config.swagger.host = args.host;
    }
    if (args.yaml) {
      config.swagger.yaml = args.yaml;
    }
    if (args.json) {
      config.swagger.yaml = false;
    }

    const compilerOptions = validateCompilerOptions(config.compilerOptions);
    const swaggerConfig = validateSwaggerConfig(config.swagger);
    const metadata = new MetadataGenerator(swaggerConfig.entryFile, compilerOptions).Generate();
    const spec = new SpecGenerator(metadata, config.swagger).GetSpec();

    const exists = fs.existsSync(swaggerConfig.outputDirectory);
    if (!exists) {
      fs.mkdirSync(swaggerConfig.outputDirectory);
    }
    let data = JSON.stringify(spec, null, '\t');
    if (config.swagger.yaml) {
      data = YAML.stringify(JSON.parse(data), 10);
    }
    const ext = config.swagger.yaml ? 'yaml' : 'json';

    fs.writeFileSync(`${swaggerConfig.outputDirectory}/swagger.${ext}`, data, { encoding: 'utf8' });
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.error('Generate swagger error.\n', err);
  }
}

function routeGenerator(args) {
  try {
    const config = getConfig(args.configuration);
    if (args.basePath) {
      config.routes.basePath = args.basePath;
    }

    const compilerOptions = validateCompilerOptions(config.compilerOptions);
    const routesConfig = validateRoutesConfig(config.routes);
    const metadata = new MetadataGenerator(routesConfig.entryFile, compilerOptions).Generate();
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
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.error('Generate routes error.\n', err);
  }
}
