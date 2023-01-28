import * as ts from 'typescript';
import { ExtendedRoutesConfig } from '../cli';
import { MetadataGenerator } from '../metadataGeneration/metadataGenerator';
import { Tsoa } from '@tsoa/runtime';
import { DefaultRouteGenerator } from '../routeGeneration/defaultRouteGenerator';
import { fsMkDir } from '../utils/fs';
import path = require('path');
import { AbstractRouteGenerator } from '../routeGeneration/routeGenerator';

export async function generateRoutes<Config extends ExtendedRoutesConfig>(
  routesConfig: Config,
  compilerOptions?: ts.CompilerOptions,
  ignorePaths?: string[],
  /**
   * pass in cached metadata returned in a previous step to speed things up
   */
  metadata?: Tsoa.Metadata,
) {
  if (!metadata) {
    metadata = new MetadataGenerator(routesConfig.entryFile, compilerOptions, ignorePaths, routesConfig.controllerPathGlobs, routesConfig.rootSecurity).Generate();
  }

  const routeGenerator = await getRouteGenerator(metadata, routesConfig);

  await fsMkDir(routesConfig.routesDir, { recursive: true });
  await routeGenerator.GenerateCustomRoutes();

  return metadata;
}

async function getRouteGenerator<Config extends ExtendedRoutesConfig>(metadata: Tsoa.Metadata, routesConfig: Config) {
  // default route generator for express/koa/hapi
  // custom route generator
  if (routesConfig.routeGenerator !== undefined) {
    if (typeof routesConfig.routeGenerator === 'string') {
      try {
        // try as a module import
        const module = await import(routesConfig.routeGenerator);
        return new module.default(metadata, routesConfig);
      } catch (_err) {
        // try to find a relative import path
        const relativePath = path.relative(__dirname, routesConfig.routeGenerator);
        const module = await import(relativePath);
        return new module.default(metadata, routesConfig);
      }
    } else {
      if (routesConfig.routeGenerator.prototype instanceof AbstractRouteGenerator<any>) {
        return new routesConfig.routeGenerator(metadata, routesConfig);
      } else {
        throw new Error('routeGenerator is not a string nor a type that extends AbstractRouteGenerator');
      }
    }
  }
  if (routesConfig.middleware !== undefined || routesConfig.middlewareTemplate !== undefined) {
    return new DefaultRouteGenerator(metadata, routesConfig);
  } else {
    routesConfig.middleware = 'express';
    return new DefaultRouteGenerator(metadata, routesConfig);
  }
}
