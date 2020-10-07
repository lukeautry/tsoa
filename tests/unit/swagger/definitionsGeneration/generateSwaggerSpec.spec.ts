import { expect } from 'chai';
import 'mocha';
import { getSwaggerOutputPath, SwaggerConfig } from '../../../../src/module/generate-swagger-spec';

const fakeSwaggerConfig = ({ outputDirectory, yaml, outputBasename, ...more }: { outputDirectory: string; yaml?: boolean; outputBasename?: string }) => {
  const answer: SwaggerConfig = {
    entryFile: '',
    outputDirectory,
    yaml,
    outputBasename,
    ...more,
  };
  return answer;
};

describe('getSwaggerOutputPath()', () => {
  it('should make the output path (base case)', () => {
    const result = getSwaggerOutputPath(
      fakeSwaggerConfig({
        outputDirectory: '.',
      }),
    );
    expect(result).to.equal('./swagger.json');
  });

  it('should make the output path (YAML)', () => {
    const result = getSwaggerOutputPath(
      fakeSwaggerConfig({
        outputDirectory: '.',
        yaml: true,
      }),
    );
    expect(result).to.equal('./swagger.yaml');
  });

  it('should make the output path (YAML, different filename)', () => {
    const result = getSwaggerOutputPath(
      fakeSwaggerConfig({
        outputDirectory: '.',
        yaml: true,
        outputBasename: 'api-spec',
      }),
    );
    expect(result).to.equal('./api-spec.yaml');
  });

  it('should make the output path (Different filename, Different directory)', () => {
    const result = getSwaggerOutputPath(
      fakeSwaggerConfig({
        outputDirectory: 'my-routes',
        outputBasename: 'private-routes',
      }),
    );
    expect(result).to.equal('my-routes/private-routes.json');
  });
});
