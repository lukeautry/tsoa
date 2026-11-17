import { findInstalledPackage, selectCompiler, type InstalledPackage } from '@tsoa/cli/metadataGeneration/native/selectCompiler';
import { expect } from 'chai';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import 'mocha';

const project = '/project';
const tsgoPlatforms = {
  '@tsoa/compiler-helper-tsgo-linux-x64': '7.0.0',
  '@tsoa/compiler-helper-tsgo-darwin-arm64': '7.0.0',
};

const pkg = (name: string, version: string, extra: Partial<InstalledPackage['packageJson']> = {}): [string, InstalledPackage] => [
  name,
  { version, directory: `${project}/node_modules/${name}`, packageJson: { version, ...extra } },
];
const tsgoHelper = (typescriptVersion = '7.1.0-beta') => pkg('@tsoa/compiler-helper-tsgo', '7.0.0', { optionalDependencies: tsgoPlatforms, tsoaCompilerHelper: { typescriptVersion } });
const tsrsHelper = () =>
  pkg('@tsoa/compiler-helper-tsrs', '7.0.0', {
    optionalDependencies: { '@tsoa/compiler-helper-tsrs-linux-x64': '7.0.0' },
    tsoaCompilerHelper: { typescriptVersion: '7.1.0-beta' },
  });

const select = (installed: Array<[string, InstalledPackage]>, override?: string) => {
  const packages = new Map(installed);
  return selectCompiler({ projectDirectory: project, override, platform: 'linux', arch: 'x64', findPackage: name => packages.get(name) });
};

describe('selectCompiler', () => {
  it('uses TypeScript itself for typescript 5', () => {
    expect(select([pkg('typescript', '5.9.3')])).to.deep.equal({ kind: 'typescript' });
  });

  it('uses TypeScript itself for typescript 6, even with a helper installed', () => {
    expect(select([pkg('typescript', '6.0.3'), tsgoHelper(), pkg('@tsoa/compiler-helper-tsgo-linux-x64', '7.0.0')])).to.deep.equal({ kind: 'typescript' });
  });

  it('uses the tsgo helper for typescript 7', () => {
    const choice = select([pkg('typescript', '7.0.2'), tsgoHelper(), pkg('@tsoa/compiler-helper-tsgo-linux-x64', '7.0.0')]);
    expect(choice).to.deep.equal({
      kind: 'helper',
      helperPath: join(`${project}/node_modules/@tsoa/compiler-helper-tsgo-linux-x64`, 'bin', 'helper'),
      description: 'tsgo helper @tsoa/compiler-helper-tsgo 7.0.0 (built from TypeScript 7.1.0-beta) for typescript 7.0.2',
    });
  });

  it('uses the tsrs helper when tsrs and typescript 7 are both installed', () => {
    const choice = select([pkg('typescript', '7.0.2'), pkg('tsrs', '0.25.0-ts7.1.0-beta'), tsgoHelper(), tsrsHelper(), pkg('@tsoa/compiler-helper-tsrs-linux-x64', '7.0.0')]);
    expect(choice).to.deep.include({ kind: 'helper', helperPath: join(`${project}/node_modules/@tsoa/compiler-helper-tsrs-linux-x64`, 'bin', 'helper') });
  });

  it('names helper.exe on Windows', () => {
    const packages = new Map([pkg('typescript', '7.0.2'), tsgoHelper(), pkg('@tsoa/compiler-helper-tsgo-win32-x64', '7.0.0')]);
    const choice = selectCompiler({ projectDirectory: project, override: undefined, platform: 'win32', arch: 'x64', findPackage: name => packages.get(name) });
    expect(choice).to.deep.include({ helperPath: join(`${project}/node_modules/@tsoa/compiler-helper-tsgo-win32-x64`, 'bin', 'helper.exe') });
  });

  it('lets TSOA_COMPILER_HELPER win over detection, with nothing installed', () => {
    expect(select([], '/custom/helper')).to.deep.equal({ kind: 'helper', helperPath: '/custom/helper', description: 'TSOA_COMPILER_HELPER=/custom/helper' });
  });

  it('lets TSOA_COMPILER_HELPER win over typescript 6', () => {
    expect(select([pkg('typescript', '6.0.3')], '/custom/helper')).to.deep.include({ helperPath: '/custom/helper' });
  });

  it('fails when neither typescript nor tsrs is installed', () => {
    expect(() => select([])).to.throw('tsoa found neither typescript nor tsrs in /project. tsoa needs TypeScript 5, 6 or 7, or tsrs. Install one, for example: npm install --save-dev typescript');
  });

  it('fails on typescript 4', () => {
    expect(() => select([pkg('typescript', '4.9.5')])).to.throw('tsoa found typescript 4.9.5 in /project. tsoa needs TypeScript 5, 6 or 7, or tsrs.');
  });

  it('fails when typescript 7 is installed without the tsgo helper', () => {
    expect(() => select([pkg('typescript', '7.0.2')])).to.throw(
      'tsoa found typescript 7.0.2 in /project, which needs the tsgo compiler helper. Install it: npm install --save-dev @tsoa/compiler-helper-tsgo',
    );
  });

  it('fails when tsrs is installed without the tsrs helper, even with the tsgo helper', () => {
    expect(() => select([pkg('typescript', '7.0.2'), pkg('tsrs', '0.25.0-ts7.1.0-beta'), tsgoHelper(), pkg('@tsoa/compiler-helper-tsgo-linux-x64', '7.0.0')])).to.throw(
      'tsoa found tsrs 0.25.0-ts7.1.0-beta in /project, which needs the tsrs compiler helper. Install it: npm install --save-dev @tsoa/compiler-helper-tsrs',
    );
  });

  it('fails when the helper has no binary for this platform, naming the platforms it has', () => {
    expect(() => select([pkg('typescript', '7.0.2'), tsgoHelper()])).to.throw(
      '@tsoa/compiler-helper-tsgo 7.0.0 has no binary for linux-x64 (@tsoa/compiler-helper-tsgo-linux-x64 is not installed). It has binaries for: linux-x64, darwin-arm64.',
    );
  });

  it('fails on typescript 8 with a helper built for TypeScript 7, naming both versions', () => {
    expect(() => select([pkg('typescript', '8.0.0'), tsgoHelper(), pkg('@tsoa/compiler-helper-tsgo-linux-x64', '7.0.0')])).to.throw(
      'tsoa found typescript 8.0.0, but @tsoa/compiler-helper-tsgo 7.0.0 is built for TypeScript 7.1.0-beta. A helper runs only on the TypeScript major it was built for.',
    );
  });

  it('fails on a tsrs that ports another TypeScript major than its helper', () => {
    expect(() => select([pkg('tsrs', '0.40.0-ts8.0.0'), tsrsHelper(), pkg('@tsoa/compiler-helper-tsrs-linux-x64', '7.0.0')])).to.throw(
      'tsoa found tsrs 0.40.0-ts8.0.0, which ports TypeScript 8.0.0, but @tsoa/compiler-helper-tsrs 7.0.0 is built for TypeScript 7.1.0-beta.',
    );
  });

  it('fails on a tsrs version that names no TypeScript version', () => {
    expect(() => select([pkg('tsrs', '0.25.0')])).to.throw('tsoa cannot tell which TypeScript version tsrs 0.25.0 ports');
  });
});

describe('findInstalledPackage', () => {
  let root: string;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'tsoa-find-package-'));
    const typescript = join(root, 'node_modules', 'typescript');
    mkdirSync(typescript, { recursive: true });
    writeFileSync(join(typescript, 'package.json'), JSON.stringify({ name: 'typescript', version: '7.0.2', exports: { './package.json': './package.json' } }));
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  // Node resolves symlinks, and macOS's temporary directory sits under one (/var is /private/var).
  it('resolves a package from the project directory, not from tsoa', () => {
    expect(findInstalledPackage('typescript', root)).to.deep.include({ version: '7.0.2', directory: join(realpathSync(root), 'node_modules', 'typescript') });
  });

  it('returns undefined for a package the project does not have', () => {
    expect(findInstalledPackage('tsrs', root)).to.equal(undefined);
  });
});
