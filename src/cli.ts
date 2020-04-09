#!/usr/bin/env node
import * as path from 'path';
import * as ts from 'typescript';
import * as YAML from 'yamljs';
import * as yargs from 'yargs';
import { Config, RoutesConfig, SwaggerConfig } from './config';
import { MetadataGenerator } from './metadataGeneration/metadataGenerator';
import { generateRoutes } from './module/generate-routes';
import { generateSwaggerSpec } from './module/generate-swagger-spec';
import { fsExists, fsReadFile } from './utils/fs';

const workingDir: string = process.cwd();

let packageJson: any;
const getPackageJsonValue = async (key: string, defaultValue = ''): Promise<string> => {
  if (!packageJson) {
    try {
      const packageJsonRaw = await fsReadFile(`${workingDir}/package.json`);
      packageJson = JSON.parse(packageJsonRaw.toString('utf8'));
    } catch (err) {
      return defaultValue;
    }
  }

  return packageJson[key] || '';
};

const nameDefault = () => getPackageJsonValue('name', 'TSOA');
const versionDefault = () => getPackageJsonValue('version', '1.0.0');
const descriptionDefault = () => getPackageJsonValue('description', 'Build swagger-compliant REST APIs using TypeScript and Node');
const licenseDefault = () => getPackageJsonValue('license', 'MIT');
const determineNoImplicitAdditionalSetting = (noImplicitAdditionalProperties: Config['noImplicitAdditionalProperties']): Exclude<Config['noImplicitAdditionalProperties'], undefined> => {
  if (noImplicitAdditionalProperties === 'silently-remove-extras' || noImplicitAdditionalProperties === 'throw-on-extras' || noImplicitAdditionalProperties === 'ignore') {
    return noImplicitAdditionalProperties;
  } else {
    return 'ignore';
  }
};

const getConfig = async (configPath = 'tsoa.json'): Promise<Config> => {
  let config: Config;
  try {
    const ext = path.extname(configPath);
    if (ext === '.yaml' || ext === '.yml') {
      config = YAML.load(configPath);
    } else {
      const configRaw = await fsReadFile(`${workingDir}/${configPath}`);
      config = JSON.parse(configRaw.toString('utf8'));
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

export interface ExtendedSwaggerConfig extends SwaggerConfig {
  entryFile: Config['entryFile'];
  noImplicitAdditionalProperties: Exclude<Config['noImplicitAdditionalProperties'], undefined>;
  controllerPathGlobs?: Config['controllerPathGlobs'];
}

export const validateSwaggerConfig = async (config: Config): Promise<ExtendedSwaggerConfig> => {
  if (!config.swagger.outputDirectory) {
    throw new Error('Missing outputDirectory: configuration must contain output directory.');
  }
  if (!config.entryFile) {
    throw new Error('Missing entryFile: Configuration must contain an entry point file.');
  }
  if (!(await fsExists(config.entryFile))) {
    throw new Error(`EntryFile not found: ${config.entryFile} - Please check your tsoa config.`);
  }
  config.swagger.version = config.swagger.version || (await versionDefault());

  config.swagger.specVersion = config.swagger.specVersion || 2;
  if (config.swagger.specVersion !== 2 && config.swagger.specVersion !== 3) {
    throw new Error('Unsupported Spec version.');
  }

  const noImplicitAdditionalProperties = determineNoImplicitAdditionalSetting(config.noImplicitAdditionalProperties);
  config.swagger.name = config.swagger.name || (await nameDefault());
  config.swagger.description = config.swagger.description || (await descriptionDefault());
  config.swagger.license = config.swagger.license || (await licenseDefault());
  config.swagger.basePath = config.swagger.basePath || '/';

  return {
    ...config.swagger,
    noImplicitAdditionalProperties,
    entryFile: config.entryFile,
    controllerPathGlobs: config.controllerPathGlobs,
  };
};

export interface ExtendedRoutesConfig extends RoutesConfig {
  entryFile: Config['entryFile'];
  noImplicitAdditionalProperties: Exclude<Config['noImplicitAdditionalProperties'], undefined>;
  controllerPathGlobs?: Config['controllerPathGlobs'];
}

const validateRoutesConfig = async (config: Config): Promise<ExtendedRoutesConfig> => {
  if (!config.entryFile) {
    throw new Error('Missing entryFile: Configuration must contain an entry point file.');
  }
  if (!(await fsExists(config.entryFile))) {
    throw new Error(`EntryFile not found: ${config.entryFile} - Please check your tsoa config.`);
  }
  if (!config.routes.routesDir) {
    throw new Error('Missing routesDir: Configuration must contain a routes file output directory.');
  }

  if (config.routes.authenticationModule && !((await fsExists(config.routes.authenticationModule)) || (await fsExists(config.routes.authenticationModule + '.ts')))) {
    throw new Error(`No authenticationModule file found at '${config.routes.authenticationModule}'`);
  }

  if (config.routes.iocModule && !((await fsExists(config.routes.iocModule)) || (await fsExists(config.routes.iocModule + '.ts')))) {
    throw new Error(`No iocModule file found at '${config.routes.iocModule}'`);
  }

  const noImplicitAdditionalProperties = determineNoImplicitAdditionalSetting(config.noImplicitAdditionalProperties);
  config.routes.basePath = config.routes.basePath || '/';
  config.routes.middleware = config.routes.middleware || 'express';

  return {
    ...config.routes,
    entryFile: config.entryFile,
    noImplicitAdditionalProperties,
    controllerPathGlobs: config.controllerPathGlobs,
  };
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

export interface ConfigArgs {
  basePath?: string;
  configuration?: string;
}

export interface SwaggerArgs extends ConfigArgs {
  host?: string;
  json?: boolean;
  yaml?: boolean;
}

if (!module.parent) {
  yargs
    .usage('Usage: $0 <command> [options]')
    .demand(1)
    .command(
      'swagger',
      'Generate swagger spec',
      {
        basePath: basePathArgs,
        configuration: configurationArgs,
        host: hostArgs,
        json: jsonArgs,
        yaml: yarmlArgs,
      },
      swaggerSpecGenerator as any,
    )
    .command(
      'routes',
      'Generate routes',
      {
        basePath: basePathArgs,
        configuration: configurationArgs,
      },
      routeGenerator as any,
    )
    .command(
      'swagger-and-routes',
      'Generate swagger and routes',
      {
        basePath: basePathArgs,
        configuration: configurationArgs,
        host: hostArgs,
        json: jsonArgs,
        yaml: yarmlArgs,
      },
      generateSwaggerAndRoutes as any,
    )
    .help('help')
    .alias('help', 'h').argv;
}

async function swaggerSpecGenerator(args: SwaggerArgs) {
  try {
    const config = await getConfig(args.configuration);
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
    const swaggerConfig = await validateSwaggerConfig(config);

    await generateSwaggerSpec(swaggerConfig, compilerOptions, config.ignore);
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.error('Generate swagger error.\n', err);
    process.exit(1);
  }
}

async function routeGenerator(args: ConfigArgs) {
  try {
    const config = await getConfig(args.configuration);
    if (args.basePath) {
      config.routes.basePath = args.basePath;
    }

    const compilerOptions = validateCompilerOptions(config.compilerOptions);
    const routesConfig = await validateRoutesConfig(config);

    await generateRoutes(routesConfig, compilerOptions, config.ignore);
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.error('Generate routes error.\n', err);
    process.exit(1);
  }
}

export async function generateSwaggerAndRoutes(args: SwaggerArgs) {
  try {
    const config = await getConfig(args.configuration);
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
    const routesConfig = await validateRoutesConfig(config);
    const swaggerConfig = await validateSwaggerConfig(config);

    const metadata = new MetadataGenerator(routesConfig.entryFile, compilerOptions, config.ignore, routesConfig.controllerPathGlobs).Generate();

    return await Promise.all([generateRoutes(routesConfig, compilerOptions, config.ignore, metadata), generateSwaggerSpec(swaggerConfig, compilerOptions, config.ignore, metadata)]);
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.error('Generate routes error.\n', err);
    process.exit(1);
    throw err;
  }
}
