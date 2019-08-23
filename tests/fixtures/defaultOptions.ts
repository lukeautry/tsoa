import { SwaggerConfig } from './../../src/config';
export function getDefaultOptions(outputDirectory: string = '', entryFile: string = ''): SwaggerConfig {
  return {
    basePath: '/v1',
    description: 'Description of a test API',
    entryFile,
    host: 'localhost:3000',
    license: 'MIT',
    name: 'Test API',
    outputDirectory,
    securityDefinitions: {
      basic: {
        type: 'basic',
      },
    },
    version: '1.0.0',
  };
}
