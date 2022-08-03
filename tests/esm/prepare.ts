import chalk from 'chalk';
import { generateSpecAndRoutes, generateRoutes } from '@namecheap/tsoa-cli';
import { hrtime } from 'process';

const specESM = async () => {
  const result = await generateSpecAndRoutes({
    configuration: 'tsoa.json',
  });
  return result;
};

const log = async <T>(label: string, fn: () => Promise<T>) => {
  console.log(chalk.dim(chalk.green(`↻ Starting ${label}...`)));

  const start = hrtime();

  const result = await fn();

  const end = hrtime(start);
  console.log(chalk.green(`✓ Finished ${label} in ${(end[0] * 1000 + end[1] / 1e6).toFixed(2)}ms`));

  return result;
};

(async () => {
  const metadataESM = await log('Swagger Spec Generation', specESM);

  await log('Express ESM Route Generation', () =>
    generateRoutes(
      {
        noImplicitAdditionalProperties: 'silently-remove-extras',
        basePath: '/v1',
        entryFile: './fixtures/express/server.ts',
        middleware: 'express',
        routesDir: './fixtures/express',
        authenticationModule: './fixtures/express/authentication.ts',
        esm: true,
      },
      undefined,
      undefined,
      metadataESM,
    ),
  );
})();
