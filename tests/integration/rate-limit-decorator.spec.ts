import 'reflect-metadata';
import { expect } from 'chai';
import { MetadataGenerator, MetadataGeneratorOptions } from '../../packages/cli/src/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '../../packages/cli/src/swagger/specGenerator3';
import * as path from 'path';
import { RateLimitByUserIdProcessor } from '../fixtures/controllers/rateLimitDecorator';

describe('Rate Limit Decorator Integration Test', () => {
  it('should generate OpenAPI spec with rate limit extension using decorator processor', () => {
    const metadata = new MetadataGenerator(path.join(__dirname, '../fixtures/controllers/rateLimitController.ts'), {}, [], undefined, {
      customDecoratorProcessors: {
        RateLimitByUserId: RateLimitByUserIdProcessor,
      },
    } as MetadataGeneratorOptions);

    const generatedMetadata = metadata.Generate();

    const spec = new SpecGenerator3(generatedMetadata, {
      name: 'Rate Limit Test API',
      description: 'Test API with rate limiting',
      version: '1.0.0',
      outputDirectory: 'temp',
      specVersion: '3.0.0' as any,
      entryFile: '',
      controllerPathGlobs: [],
      noImplicitAdditionalProperties: 'ignore',
    }).GetSpec();

    const paths = spec.paths;
    expect(paths['/rateLimit/test']).to.exist;
    expect(paths['/rateLimit/test'].get).to.exist;

    const testOperation = paths['/rateLimit/test'].get as any;
    expect(testOperation['x-rate-limit-by-user-id']).to.exist;
    expect(testOperation['x-rate-limit-by-user-id'].limit).to.equal(100);
    expect(testOperation['x-rate-limit-by-user-id'].timeWindow).to.equal(60);
  });
});
