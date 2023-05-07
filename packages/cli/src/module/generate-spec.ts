import * as ts from 'typescript';
import * as YAML from 'yamljs';
import { ExtendedSpecConfig } from '../cli';
import { MetadataGenerator } from '../metadataGeneration/metadataGenerator';
import {Tsoa, Swagger, Config} from '@tsoa/runtime';
import { SpecGenerator2 } from '../swagger/specGenerator2';
import { SpecGenerator3 } from '../swagger/specGenerator3';
import { fsMkDir, fsWriteFile } from '../utils/fs';

export const getSwaggerOutputPath = (swaggerConfig: ExtendedSpecConfig) => {
  const ext = swaggerConfig.yaml ? 'yaml' : 'json';
  const specFileBaseName = swaggerConfig.specFileBaseName || 'swagger';

  return `${swaggerConfig.outputDirectory}/${specFileBaseName}.${ext}`;
};

export const generateSpec = async (
  swaggerConfig: ExtendedSpecConfig,
  compilerOptions?: ts.CompilerOptions,
  ignorePaths?: string[],
  /**
   * pass in cached metadata returned in a previous step to speed things up
   */
  metadata?: Tsoa.Metadata,
  defaultNumberType?: Config['defaultNumberType']
) => {
  if (!metadata) {
    metadata = new MetadataGenerator(swaggerConfig.entryFile, compilerOptions, ignorePaths, swaggerConfig.controllerPathGlobs, swaggerConfig.rootSecurity, defaultNumberType).Generate();
  }

  let spec: Swagger.Spec;
  if (swaggerConfig.specVersion && swaggerConfig.specVersion === 3) {
    spec = new SpecGenerator3(metadata, swaggerConfig).GetSpec();
  } else {
    spec = new SpecGenerator2(metadata, swaggerConfig).GetSpec();
  }

  await fsMkDir(swaggerConfig.outputDirectory, { recursive: true });

  let data = JSON.stringify(spec, null, '\t');
  if (swaggerConfig.yaml) {
    data = YAML.stringify(JSON.parse(data), 10);
  }

  const outputPath = getSwaggerOutputPath(swaggerConfig);
  await fsWriteFile(outputPath, data, { encoding: 'utf8' });

  return metadata;
};
