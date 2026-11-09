import { expect } from 'chai';
import 'mocha';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { build } from 'esbuild';

// Regression test for the "bundled consumer" scenario: when an application
// bundles @tsoa/cli (esbuild, webpack, ...), the bundler rewrites __dirname to
// the bundle's output directory, so the package-relative template lookup points
// at the consumer project instead of the CLI package. resolveDefaultTemplatePath
// must fall back to the actually installed package location in that case.
describe('DefaultRouteGenerator (bundled consumer regression)', function () {
  this.timeout(60000);

  const consumerEntry = path.resolve(__dirname, '..', '..', 'fixtures', 'tsconfig-bundler', 'pkg', 'consumer', 'entry.ts');
  const outDir = path.resolve(__dirname, '..', '..', 'fixtures', 'tsconfig-bundler', 'pkg', 'consumer', 'out');
  const outFile = path.join(outDir, 'bundle.js');
  const templates = ['express.hbs', 'hapi.hbs', 'koa.hbs'];

  before(async function () {
    fs.mkdirSync(outDir, { recursive: true });
    await build({
      entryPoints: [consumerEntry],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: outFile,
      logLevel: 'silent'
    });
  });

  after(function () {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it('resolves the built-in templates when __dirname is rewritten to the bundle output directory', function () {
    const output = execFileSync(process.execPath, [outFile], { encoding: 'utf8' });
    const lines = output.split('\n').filter(line => line.length > 0);
    expect(lines).to.have.length(templates.length);

    for (const line of lines) {
      const result = JSON.parse(line) as { name: string; resolved: string; exists: boolean };
      expect(templates).to.include(result.name);
      expect(result.exists, `expected ${result.resolved} to exist`).to.equal(true);
      expect(path.basename(result.resolved)).to.equal(result.name);
    }
  });
});
