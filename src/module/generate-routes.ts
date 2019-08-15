import * as path from 'path';
import * as ts from 'typescript';
import { RoutesConfig } from '../config';
import { MetadataGenerator } from '../metadataGeneration/metadataGenerator';
import { Tsoa } from '../metadataGeneration/tsoa';
import { RouteGenerator, SwaggerConfigRelatedToRoutes } from '../routeGeneration/routeGenerator';
import { warnAdditionalPropertiesDeprecation } from '../utils/deprecations';

export const generateRoutes = async (
  routesConfig: RoutesConfig,
  minimalSwaggerConfig: SwaggerConfigRelatedToRoutes,
  compilerOptions?: ts.CompilerOptions,
  ignorePaths?: string[],
  /**
   * pass in cached metadata returned in a previous step to speed things up
   */
  metadata?: Tsoa.Metadata,
) => {
  if (!metadata) {
    metadata = new MetadataGenerator(
      routesConfig.entryFile,
      compilerOptions,
      ignorePaths,
      routesConfig.controllerPathGlobs,
    ).Generate();
  }

  const routeGenerator = new RouteGenerator(metadata, routesConfig, exactly(minimalSwaggerConfig));

  let pathTransformer;
  let template;
  pathTransformer = (path: string) => path.replace(/{/g, ':').replace(/}/g, '');

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

  await routeGenerator.GenerateCustomRoutes(template, pathTransformer);

  return metadata;
};

const exactly = (input: SwaggerConfigRelatedToRoutes): SwaggerConfigRelatedToRoutes => {
  // Validate the config values first
  if (input.noImplicitAdditionalProperties === true) {
    warnAdditionalPropertiesDeprecation(input.noImplicitAdditionalProperties);
  } else if (input.noImplicitAdditionalProperties === false) {
    warnAdditionalPropertiesDeprecation(input.noImplicitAdditionalProperties);
  } else if (
    input.noImplicitAdditionalProperties === undefined ||
    input.noImplicitAdditionalProperties === 'throw-on-extras' ||
    input.noImplicitAdditionalProperties === 'silently-remove-extras'
  ) {
    // then it's good to go
  } else {
    throw new Error(`noImplicitAdditionalProperties is set to an invalid value. See https://github.com/lukeautry/tsoa/blob/master/src/config.ts for available options.`);
  }

  // Make an exact copy that doesn't have other properties
  const recordOfProps: Record<keyof SwaggerConfigRelatedToRoutes, 'right side does not matter'> = {
    noImplicitAdditionalProperties: 'right side does not matter',
  };

  const exactObj: SwaggerConfigRelatedToRoutes = {};
  Object.keys(recordOfProps).forEach((key) => {
    const strictKey = key as keyof SwaggerConfigRelatedToRoutes;
    exactObj[strictKey] = input[strictKey];
  });
  return exactObj;
};
