import * as ts from 'typescript';
import * as YAML from 'yamljs';
import { RoutesConfig, SwaggerConfig } from '../config';
export { SwaggerConfig, Config, RoutesConfig } from '../config';
import { MetadataGenerator } from '../metadataGeneration/metadataGenerator';
import { Tsoa } from '../metadataGeneration/tsoa';
import { SpecGenerator2 } from '../swagger/specGenerator2';
import { SpecGenerator3 } from '../swagger/specGenerator3';
import { Swagger } from '../swagger/swagger';
import { fsExists, fsMkDir, fsWriteFile } from '../utils/fs';
import { validateMutualConfigs } from '../utils/mutualConfigValidation';

export interface RoutesConfigRelatedToSwagger {
  controllerPathGlobs?: RoutesConfig['controllerPathGlobs'];
}

export const getSwaggerOutputPath = (swaggerConfig: SwaggerConfig) => {
  const ext = swaggerConfig.yaml ? 'yaml' : 'json';
  const outputBasename = swaggerConfig.outputBasename || 'openapi';

  return `${swaggerConfig.outputDirectory}/${outputBasename}.${ext}`;
};

export const generateSwaggerSpec = async (
  swaggerConfig: SwaggerConfig,
  routesConfigRelatedToSwagger: RoutesConfigRelatedToSwagger,
  compilerOptions?: ts.CompilerOptions,
  ignorePaths?: string[],
  /**
   * pass in cached metadata returned in a previous step to speed things up
   */
  metadata?: Tsoa.Metadata,
) => {
  // NOTE: I did not realize that the controllerPathGlobs was related to both swagger
  //   and route generation when I merged https://github.com/lukeautry/tsoa/pull/396
  //   So this allows tsoa consumers to submit it on either config and tsoa will respect the selection
  if (routesConfigRelatedToSwagger.controllerPathGlobs && !swaggerConfig.controllerPathGlobs) {
    swaggerConfig.controllerPathGlobs = routesConfigRelatedToSwagger.controllerPathGlobs;
  }
  validateMutualConfigs(routesConfigRelatedToSwagger, swaggerConfig);

  if (!metadata) {
    metadata = new MetadataGenerator(swaggerConfig.entryFile, compilerOptions, ignorePaths, swaggerConfig.controllerPathGlobs).Generate();
  }

  let spec: Swagger.Spec;
  if (swaggerConfig.specVersion && swaggerConfig.specVersion === 3) {
    spec = new SpecGenerator3(metadata, swaggerConfig).GetSpec();
  } else {
    spec = new SpecGenerator2(metadata, swaggerConfig).GetSpec();
  }

  const exists = await fsExists(swaggerConfig.outputDirectory);
  if (!exists) {
    await fsMkDir(swaggerConfig.outputDirectory);
  }

  let data = JSON.stringify(spec, null, '\t');
  if (swaggerConfig.yaml) {
    data = YAML.stringify(JSON.parse(data), 10);
  }

  const outputPath = getSwaggerOutputPath(swaggerConfig);
  await fsWriteFile(outputPath, data, { encoding: 'utf8' });

  return metadata;
};
