import { expect } from 'chai';
import 'mocha';
import { join } from 'path';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { initConfig, validateSpecConfig } from '@tsoa/cli/cli';
import { Config } from '@tsoa/runtime';

describe('initConfig', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = realpathSync.native(mkdtempSync(join(tmpdir(), 'tsoa-init-')));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('writes a tsoa.json that the cli accepts', async () => {
    const configPath = await initConfig({}, projectDir);
    expect(configPath).to.equal(`${projectDir}/tsoa.json`);

    const config: Config = JSON.parse(readFileSync(configPath, 'utf8'));
    expect(config.routes).to.deep.equal({ routesDir: 'build' });
    const spec = await validateSpecConfig(config);
    expect(spec.outputDirectory).to.equal('build');
    expect(spec.controllerPathGlobs).to.deep.equal(['src/**/*Controller.ts']);
  });

  it('sets the middleware when it is not express', async () => {
    const config: Config = JSON.parse(readFileSync(await initConfig({ middleware: 'koa' }, projectDir), 'utf8'));
    expect(config.routes).to.deep.equal({ routesDir: 'build', middleware: 'koa' });
  });

  it('does not overwrite an existing tsoa.json', async () => {
    writeFileSync(join(projectDir, 'tsoa.json'), '{}');
    let error: Error | undefined;
    try {
      await initConfig({}, projectDir);
    } catch (err) {
      error = err as Error;
    }
    expect(error?.message).to.match(/already exists/);
    expect(readFileSync(join(projectDir, 'tsoa.json'), 'utf8')).to.equal('{}');
  });
});
