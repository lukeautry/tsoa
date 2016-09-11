import { Options } from '../../src/swagger/specGenerator';

export function getDefaultOptions(): Options {
  return {
    basePath: '/',
    description: 'Description of a test API',
    host: 'localhost:3000',
    license: 'MIT',
    name: 'Test API',
    version: '1.0.0',
  };
};
