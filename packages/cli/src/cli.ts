#!/usr/bin/env node
import YAML from 'yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Config, RoutesConfig, SpecConfig, Tsoa } from '@tsoa/runtime';
import { MetadataGenerator } from './metadataGeneration/metadataGenerator';
import { generateRoutes } from './module/generate-routes';
import { generateSpec } from './module/generate-spec';
import { fsExists, fsReadFile } from './utils/fs';
import { AbstractRouteGenerator } from './routeGeneration/routeGenerator';
import { extname, isAbsolute, dirname, join } from 'node:path';
import * as ts from 'typescript';
import type { CompilerOptions } from 'typescript';

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
const authorInformation: Promise<
  | string
  | {
      name?: string;
      email?: string;
      url?: string;
    }
> = getPackageJsonValue('author', 'unknown');

const isYamlExtension = (extension: string): boolean => extension === '.yaml' || extension === '.yml';

const isJsExtension = (extension: string): boolean => extension === '.js' || extension === '.cjs';

const getConfig = async (configPath = 'tsoa.json'): Promise<Config> => {
  let config: Config;
  const ext = extname(configPath);
  const configFullPath = isAbsolute(configPath) ? configPath : `${workingDir}/${configPath}`;
  try {
    if (isYamlExtension(ext)) {
      const configRaw = await fsReadFile(configFullPath);
      config = YAML.parse(configRaw.toString('utf8'));
    } else if (isJsExtension(ext)) {
      config = await import(configFullPath);
    } else {
      const configRaw = await fsReadFile(configFullPath);
      config = JSON.parse(configRaw.toString('utf8'));
    }
  } catch (err) {
    if (!(err instanceof Error)) {
      console.error(err);
      throw Error(`Unhandled error encountered loading '${configPath}': ${String(err)}`);
    } else if ('code' in err && err.code === 'MODULE_NOT_FOUND') {
      throw Error(`No config file found at '${configPath}'`);
    } else if (err.name === 'SyntaxError') {
      console.error(err);
      const errorType = isJsExtension(ext) ? 'JS' : 'JSON';
      throw Error(`Invalid ${errorType} syntax in config at '${configPath}': ${err.message}`);
    } else {
      console.error(err);
      throw Error(`Unhandled error encountered loading '${configPath}': ${err.message}`);
    }
  }

  return config;
};

const resolveConfig = async (config?: string | Config): Promise<Config> => {
  return typeof config === 'object' ? config : getConfig(config);
};

const readTsConfig = async (tsconfigPath: string, workingDir: string): Promise<CompilerOptions> => {
  const fullPath = isAbsolute(tsconfigPath) ? tsconfigPath : join(workingDir, tsconfigPath);
  
  try {
    const configFileText = await fsReadFile(fullPath);
    const result = ts.readConfigFile(fullPath, () => configFileText.toString('utf8'));
    
    if (result.error) {
      throw new Error(`Error reading tsconfig.json at '${tsconfigPath}': ${result.error.messageText.toString()}`);
    }
    
    const parsed = ts.parseJsonConfigFileContent(
      result.config,
      ts.sys,
      dirname(fullPath)
    );
    
    return parsed.options;
  } catch (err) {
    // Re-throw with more context, preserving the original error code if it exists
    if (err instanceof Error) {
      const errorWithCode = err as Error & { code?: string };
      if (errorWithCode.code === 'ENOENT') {
        // Preserve the ENOENT error so it can be caught upstream
        const notFoundError = new Error(`tsconfig.json not found at '${tsconfigPath}'`);
        (notFoundError as Error & { code: string }).code = 'ENOENT';
        throw notFoundError;
      }
      throw new Error(`Failed to read tsconfig.json at '${tsconfigPath}': ${err.message}`);
    }
    throw err;
  }
};

export const validateCompilerOptions = async (config: Config, workingDir: string): Promise<CompilerOptions> => {
  let compilerOptions: CompilerOptions = {};
  
  // First, read compilerOptions from tsconfig.json if specified
  const tsconfigPath = config.tsconfig || 'tsconfig.json';
  try {
    compilerOptions = await readTsConfig(tsconfigPath, workingDir);
  } catch (err) {
    // If tsconfig.json doesn't exist and no explicit tsconfig path was provided, that's okay
    // Check if it's a file not found error
    const isFileNotFound = err instanceof Error && 
      ('code' in err && err.code === 'ENOENT' || err.message.includes('ENOENT'));
    
    if (config.tsconfig || !isFileNotFound) {
      throw err;
    }
    // If no explicit tsconfig was provided and file doesn't exist, continue with empty compilerOptions
  }
  
  // Then merge with compilerOptions from tsoa.json (tsoa.json takes precedence)
  if (config.compilerOptions) {
    // Convert string values to proper TypeScript enum values by parsing a temporary config
    const tempConfig = {
      compilerOptions: { ...compilerOptions, ...config.compilerOptions },
    };
    const parsed = ts.parseJsonConfigFileContent(tempConfig, ts.sys, workingDir);
    compilerOptions = parsed.options;
  }
  
  return compilerOptions;
};

export interface ExtendedSpecConfig extends SpecConfig {
  entryFile: Config['entryFile'];
  noImplicitAdditionalProperties: Exclude<Config['noImplicitAdditionalProperties'], undefined>;
  controllerPathGlobs?: Config['controllerPathGlobs'];
}

export const validateSpecConfig = async (config: Config): Promise<ExtendedSpecConfig> => {
  if (!config.spec) {
    throw new Error('Missing spec: configuration must contain spec. Spec used to be called swagger in previous versions of tsoa.');
  }
  if (!config.spec.outputDirectory) {
    throw new Error('Missing outputDirectory: configuration must contain output directory.');
  }
  if (!config.entryFile && (!config.controllerPathGlobs || !config.controllerPathGlobs.length)) {
    throw new Error('Missing entryFile and controllerPathGlobs: Configuration must contain an entry point file or controller path globals.');
  }
  if (!!config.entryFile && !(await fsExists(config.entryFile))) {
    throw new Error(`EntryFile not found: ${config.entryFile} - please check your tsoa config.`);
  }
  config.spec.version = config.spec.version || (await versionDefault());

  config.spec.specVersion = config.spec.specVersion || 2;
  const supportedVersions = [2, 3, 3.1];
  if (!supportedVersions.includes(config.spec.specVersion)) {
    throw new Error(`Unsupported Spec version: ${config.spec.specVersion}.`);
  }

  if (config.spec.spec && !['immediate', 'recursive', 'deepmerge', undefined].includes(config.spec.specMerging)) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`Invalid specMerging config: ${config.spec.specMerging}`);
  }

  const noImplicitAdditionalProperties = determineNoImplicitAdditionalSetting(config.noImplicitAdditionalProperties);
  config.spec.name = config.spec.name || (await nameDefault());
  config.spec.description = config.spec.description || (await descriptionDefault());
  config.spec.license = config.spec.license || (await licenseDefault());
  config.spec.basePath = config.spec.basePath || '/';
  // defaults to template that may generate non-unique operation ids.
  // @see https://github.com/lukeautry/tsoa/issues/1005
  config.spec.operationIdTemplate = config.spec.operationIdTemplate || '{{titleCase method.name}}';

  if (!config.spec.contact) {
    config.spec.contact = {};
  }

  const author = await authorInformation;

  if (typeof author === 'string') {
    const contact = /^([^<(]*)?\s*(?:<([^>(]*)>)?\s*(?:\(([^)]*)\)|$)/m.exec(author);

    config.spec.contact.name = config.spec.contact.name || contact?.[1];
    config.spec.contact.email = config.spec.contact.email || contact?.[2];
    config.spec.contact.url = config.spec.contact.url || contact?.[3];
  } else if (typeof author === 'object') {
    config.spec.contact.name = config.spec.contact.name || author?.name;
    config.spec.contact.email = config.spec.contact.email || author?.email;
    config.spec.contact.url = config.spec.contact.url || author?.url;
  }

  if (!config.defaultNumberType) {
    config.defaultNumberType = 'double';
  }

  if (config.spec.rootSecurity) {
    if (!Array.isArray(config.spec.rootSecurity)) {
      throw new Error('spec.rootSecurity must be an array');
    }

    if (config.spec.rootSecurity) {
      const ok = config.spec.rootSecurity.every(security => typeof security === 'object' && security !== null && Object.values(security).every(scope => Array.isArray(scope)));

      if (!ok) {
        throw new Error('spec.rootSecurity must be an array of objects whose keys are security scheme names and values are arrays of scopes');
      }
    }
  }

  return {
    ...config.spec,
    noImplicitAdditionalProperties,
    entryFile: config.entryFile,
    controllerPathGlobs: config.controllerPathGlobs,
  };
};

type RouteGeneratorImpl = new (metadata: Tsoa.Metadata, options: ExtendedRoutesConfig) => AbstractRouteGenerator<any>;

export interface ExtendedRoutesConfig extends RoutesConfig {
  entryFile: Config['entryFile'];
  noImplicitAdditionalProperties: Exclude<Config['noImplicitAdditionalProperties'], undefined>;
  bodyCoercion: Exclude<RoutesConfig['bodyCoercion'], undefined>;
  controllerPathGlobs?: Config['controllerPathGlobs'];
  multerOpts?: Config['multerOpts'];
  rootSecurity?: Config['spec']['rootSecurity'];
  routeGenerator?: string | RouteGeneratorImpl;
}

const validateRoutesConfig = async (config: Config): Promise<ExtendedRoutesConfig> => {
  if (!config.entryFile && (!config.controllerPathGlobs || !config.controllerPathGlobs.length)) {
    throw new Error('Missing entryFile and controllerPathGlobs: Configuration must contain an entry point file or controller path globals.');
  }
  if (!!config.entryFile && !(await fsExists(config.entryFile))) {
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

  const bodyCoercion = config.routes.bodyCoercion ?? true;

  config.routes.basePath = config.routes.basePath || '/';

  return {
    ...config.routes,
    entryFile: config.entryFile,
    noImplicitAdditionalProperties,
    bodyCoercion,
    controllerPathGlobs: config.controllerPathGlobs,
    multerOpts: config.multerOpts,
    rootSecurity: config.spec.rootSecurity,
  };
};

const configurationArgs = {
  alias: 'c',
  describe: 'tsoa configuration file; default is tsoa.json in the working directory',
  required: false,
  string: true,
} as const;

const hostArgs = {
  describe: 'API host',
  required: false,
  string: true,
} as const;

const basePathArgs = {
  describe: 'Base API path',
  required: false,
  string: true,
} as const;

const yarmlArgs = {
  describe: 'Swagger spec yaml format',
  required: false,
  boolean: true,
} as const;

const jsonArgs = {
  describe: 'Swagger spec json format',
  required: false,
  boolean: true,
} as const;

export interface ConfigArgs {
  basePath?: string;
  configuration?: string | Config;
}

export interface SwaggerArgs extends ConfigArgs {
  host?: string;
  json?: boolean;
  yaml?: boolean;
}

export function runCLI() {
  return yargs(hideBin(process.argv))
    .usage('Usage: $0 <command> [options]')
    .command(
      'spec',
      'Generate OpenAPI spec',
      {
        basePath: basePathArgs,
        configuration: configurationArgs,
        host: hostArgs,
        json: jsonArgs,
        yaml: yarmlArgs,
      },
      args => SpecGenerator(args),
    )
    .command(
      'routes',
      'Generate routes',
      {
        basePath: basePathArgs,
        configuration: configurationArgs,
      },
      args => routeGenerator(args),
    )
    .command(
      'spec-and-routes',
      'Generate OpenAPI spec and routes',
      {
        basePath: basePathArgs,
        configuration: configurationArgs,
        host: hostArgs,
        json: jsonArgs,
        yaml: yarmlArgs,
      },
      args => void generateSpecAndRoutes(args),
    )
    .demandCommand(1, 1, 'Must provide a valid command.')
    .help('help')
    .alias('help', 'h')
    .parse();
}

if (require.main === module) {
  void (async () => {
    try {
      await runCLI();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('tsoa cli error:\n', err);
      process.exit(1);
    }
  })();
}

async function SpecGenerator(args: SwaggerArgs) {
  try {
    const config = await resolveConfig(args.configuration);
    if (args.basePath) {
      config.spec.basePath = args.basePath;
    }
    if (args.host) {
      config.spec.host = args.host;
    }
    if (args.yaml) {
      config.spec.yaml = args.yaml;
    }
    if (args.json) {
      config.spec.yaml = false;
    }

    const compilerOptions = await validateCompilerOptions(config, workingDir);
    const swaggerConfig = await validateSpecConfig(config);

    await generateSpec(swaggerConfig, compilerOptions, config.ignore);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Generate swagger error.\n', err);
    process.exit(1);
  }
}

async function routeGenerator(args: ConfigArgs) {
  try {
    const config = await resolveConfig(args.configuration);
    if (args.basePath) {
      config.routes.basePath = args.basePath;
    }

    const compilerOptions = await validateCompilerOptions(config, workingDir);
    const routesConfig = await validateRoutesConfig(config);

    await generateRoutes(routesConfig, compilerOptions, config.ignore);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Generate routes error.\n', err);
    process.exit(1);
  }
}

export async function generateSpecAndRoutes(args: SwaggerArgs, metadata?: Tsoa.Metadata) {
  try {
    const config = await resolveConfig(args.configuration);
    if (args.basePath) {
      config.spec.basePath = args.basePath;
    }
    if (args.host) {
      config.spec.host = args.host;
    }
    if (args.yaml) {
      config.spec.yaml = args.yaml;
    }
    if (args.json) {
      config.spec.yaml = false;
    }

    const compilerOptions = await validateCompilerOptions(config, workingDir);
    const routesConfig = await validateRoutesConfig(config);
    const swaggerConfig = await validateSpecConfig(config);

    if (!metadata) {
      metadata = new MetadataGenerator(config.entryFile, compilerOptions, config.ignore, config.controllerPathGlobs, config.spec.rootSecurity, config.defaultNumberType, config.routes.esm).Generate();
    }

    await Promise.all([generateRoutes(routesConfig, compilerOptions, config.ignore, metadata), generateSpec(swaggerConfig, compilerOptions, config.ignore, metadata)]);
    return metadata;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Generate routes error.\n', err);
    process.exit(1);
    throw err;
  }
}
export type RouteGeneratorModule<Config extends ExtendedRoutesConfig> = {
  default: new (
    metadata: Tsoa.Metadata,
    routesConfig: Config,
  ) => {
    GenerateCustomRoutes: () => Promise<void>;
  };
};
