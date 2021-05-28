import * as path from 'path';
import * as ts from 'typescript';
import { ExtendedRoutesConfig } from '../cli';
import { MetadataGenerator } from '../metadataGeneration/metadataGenerator';
import { Tsoa } from '@tsoa/runtime';
import { RouteGenerator } from '../routeGeneration/routeGenerator';
import { convertBracesPathParams } from '../utils/pathUtils';
import { fsMkDir } from '../utils/fs';

export const generateRoutes = async (
  routesConfig: ExtendedRoutesConfig,
  compilerOptions?: ts.CompilerOptions,
  ignorePaths?: string[],
  /**
   * pass in cached metadata returned in a previous step to speed things up
   */
  metadata?: Tsoa.Metadata,
) => {
  if (!metadata) {
    metadata = new MetadataGenerator(routesConfig.entryFile, compilerOptions, ignorePaths, routesConfig.controllerPathGlobs).Generate();
  }

  const routeGenerator = new RouteGenerator(metadata, routesConfig);

  let pathTransformer = convertBracesPathParams;
  let template;

  switch (routesConfig.middleware) {
    case 'express':
      template = path.join(__dirname, '..', 'routeGeneration/templates/express.hbs');
      break;
    case 'hapi':
      template = path.join(__dirname, '..', 'routeGeneration/templates/hapi.hbs');
      pathTransformer = (path: string) => path;
      break;
    case 'koa':
      template = path.join(__dirname, '..', 'routeGeneration/templates/koa.hbs');
      break;
    default:
      template = path.join(__dirname, '..', 'routeGeneration/templates/express.hbs');
  }

  if (routesConfig.middlewareTemplate) {
    template = routesConfig.middlewareTemplate;
  }

  await fsMkDir(routesConfig.routesDir, { recursive: true });
  await routeGenerator.GenerateCustomRoutes(template, pathTransformer);

  return metadata;
};
