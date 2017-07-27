import { SwaggerConfig } from './../../src/config';
export function getDefaultOptions(): SwaggerConfig {
  return {
    basePath: '/',
    description: 'Description of a test API',
    entryFile: '',
    host: 'localhost:3000',
    license: 'MIT',
    name: 'Test API',
    outputDirectory: '',
    version: '1.0.0',
  };
}
