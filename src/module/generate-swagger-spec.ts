import * as ts from 'typescript';
import * as YAML from 'yamljs';
import { SwaggerConfig } from '../config';
import { MetadataGenerator } from '../metadataGeneration/metadataGenerator';
import { SpecGenerator } from '../swagger/specGenerator';
import { fsExists, fsMkDir, fsWriteFile } from '../utils/fs';

export const generateSwaggerSpec = async (
  config: SwaggerConfig,
  compilerOptions?: ts.CompilerOptions,
  ignorePaths?: string[],
) => {
  const metadata = new MetadataGenerator(
    config.entryFile,
    compilerOptions,
    ignorePaths,
  ).Generate();
  const spec = new SpecGenerator(metadata, config).GetSpec();

  const exists = await fsExists(config.outputDirectory);
  if (!exists) {
    await fsMkDir(config.outputDirectory);
  }

  let data = JSON.stringify(spec, null, '\t');
  if (config.yaml) {
    data = YAML.stringify(JSON.parse(data), 10);
  }
  const ext = config.yaml ? 'yaml' : 'json';

  await fsWriteFile(
    `${config.outputDirectory}/swagger.${ext}`,
    data,
    { encoding: 'utf8' },
  );
};
