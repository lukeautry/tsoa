import * as ts from '../ts';
import { ExtendedRoutesConfig, RouteGeneratorModule } from '../cli';
import { MetadataGenerator } from '../metadataGeneration/metadataGenerator';
import { Tsoa } from '@tsoa/runtime';
import { DefaultRouteGenerator } from '../routeGeneration/defaultRouteGenerator';
import { fsMkDir } from '../utils/fs';
import * as path from 'path';
import { Config as BaseConfig } from '@tsoa/runtime';

export async function generateRoutes<Config extends ExtendedRoutesConfig>(
  routesConfig: Config,
  compilerOptions?: ts.CompilerOptions,
  ignorePaths?: string[],
  /**
   * pass in cached metadata returned in a previous step to speed things up
   */
  metadata?: Tsoa.Metadata,
  defaultNumberType?: BaseConfig['defaultNumberType'],
) {
  if (!metadata) {
    metadata = new MetadataGenerator(routesConfig.entryFile, compilerOptions, ignorePaths, routesConfig.controllerPathGlobs, routesConfig.rootSecurity, defaultNumberType).Generate();
  }

  const routeGenerator = getRouteGenerator(metadata, routesConfig);

  await fsMkDir(routesConfig.routesDir, { recursive: true });
  await routeGenerator.GenerateCustomRoutes();

  if (routesConfig.multerOpts) {
    console.warn(
      'Config MulterOptions is deprecated since v6.4.0 instroduces RegisterRoutes can pass multerOptions,' +
        'we will quickly remove this options soon at future version.' +
        '(https://github.com/lukeautry/tsoa/issues/1587#issuecomment-2391291433)' +
        '(https://github.com/lukeautry/tsoa/pull/1638)',
    );
  }

  return metadata;
}

function getRouteGenerator<Config extends ExtendedRoutesConfig>(metadata: Tsoa.Metadata, routesConfig: Config) {
  // default route generator for express/koa/hapi
  // custom route generator
  const routeGenerator = routesConfig.routeGenerator;
  if (routeGenerator !== undefined) {
    if (typeof routeGenerator === 'string') {
      try {
        // try as a module import. `require` keeps CommonJS resolution (extensionless paths, registered loaders) and loads ES modules too.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const module = require(routeGenerator) as RouteGeneratorModule<Config>;
        return new module.default(metadata, routesConfig);
      } catch (_err) {
        // try to find a relative import path
        const relativePath = path.relative(__dirname, routeGenerator);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const module = require(relativePath) as RouteGeneratorModule<Config>;
        return new module.default(metadata, routesConfig);
      }
    } else {
      return new routeGenerator(metadata, routesConfig);
    }
  }
  if (routesConfig.middleware !== undefined || routesConfig.middlewareTemplate !== undefined) {
    return new DefaultRouteGenerator(metadata, routesConfig);
  } else {
    routesConfig.middleware = 'express';
    return new DefaultRouteGenerator(metadata, routesConfig);
  }
}
