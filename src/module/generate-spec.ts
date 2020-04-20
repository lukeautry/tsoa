import * as ts from 'typescript';
import * as YAML from 'yamljs';
export { SpecConfig as SwaggerConfig, Config, RoutesConfig } from '../config';
import { ExtendedSpecConfig } from '../cli';
import { MetadataGenerator } from '../metadataGeneration/metadataGenerator';
import { Tsoa } from '../metadataGeneration/tsoa';
import { SpecGenerator2 } from '../swagger/specGenerator2';
import { SpecGenerator3 } from '../swagger/specGenerator3';
import { Swagger } from '../swagger/swagger';
import { fsExists, fsMkDir, fsWriteFile } from '../utils/fs';

export const generateSpec = async (
  swaggerConfig: ExtendedSpecConfig,
  compilerOptions?: ts.CompilerOptions,
  ignorePaths?: string[],
  /**
   * pass in cached metadata returned in a previous step to speed things up
   */
  metadata?: Tsoa.Metadata,
) => {
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
  const ext = swaggerConfig.yaml ? 'yaml' : 'json';

  await fsWriteFile(`${swaggerConfig.outputDirectory}/swagger.${ext}`, data, { encoding: 'utf8' });

  return metadata;
};
