#!/usr/bin/env node
// Installs tsoa, a compiler and (optionally) the packed helper tarballs into a temporary project, checks which compiler
// tsoa picks there without TSOA_COMPILER_HELPER, and compares its metadata with TypeScript 6's from this repo.
// Usage: node check-installed.mjs <compiler package spec> [<tsgo|tsrs> <directory of tarballs from pack.mjs>]
// Needs `yarn build` first. Examples:
//   node check-installed.mjs typescript@7.0.2 tsgo dist
//   node check-installed.mjs typescript@6
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const here = import.meta.dirname;
const repo = resolve(here, '..', '..');
const [compilerSpec, helper, tarballArg] = process.argv.slice(2);
if (!compilerSpec || (helper && !['tsgo', 'tsrs'].includes(helper)) || (helper && !tarballArg)) {
  console.error('usage: node check-installed.mjs <compiler package spec> [<tsgo|tsrs> <directory of tarballs from pack.mjs>]');
  process.exit(1);
}

const controller = `import { Controller, Get, Path, QueryParam, Route } from '@tsoa/runtime';

export enum Color {
  Red = 'red',
  Blue = 'blue',
}

interface Base {
  /** The id. */
  id: number;
}

export interface Widget<T> extends Base {
  name: string;
  color?: Color;
  tags: string[];
  payload: T;
  size: 'small' | 'large' | 3;
  dimensions: { width: number; height: number } | null;
  extra: Record<string, boolean>;
}

type Page<T> = { items: T[]; total: number };

@Route('widgets')
export class WidgetController extends Controller {
  /** Lists widgets. */
  @Get()
  public async list(@QueryParam() color?: Color, @QueryParam() limit = 10): Promise<Page<Widget<Date>>> {
    return { items: [], total: limit };
  }

  @Get('{id}')
  public async get(@Path() id: number): Promise<Omit<Page<Widget<string>>, 'total'> | undefined> {
    return undefined;
  }
}
`;

// Prints {choice, metadata} as JSON. Run with the project as cwd, the way the tsoa CLI runs.
const generate = `
const cli = process.argv[1];
const { selectCompiler, findInstalledPackage } = require(cli + '/dist/metadataGeneration/native/selectCompiler');
const { MetadataGenerator } = require(cli + '/dist/metadataGeneration/metadataGenerator');
const choice = selectCompiler({ projectDirectory: process.cwd(), override: process.env.TSOA_COMPILER_HELPER, platform: process.platform, arch: process.arch, findPackage: findInstalledPackage });
const metadata = new MetadataGenerator(process.argv[2], { experimentalDecorators: true, strict: true }).Generate();
const nativeLoaded = Object.keys(require.cache).some(file => /native[\\\\/]program\\.js$/.test(file));
process.stdout.write(JSON.stringify({ choice, nativeLoaded, metadata }));
`;

// TypeScript 6 and 7 order union members differently, so union members, enum values and `required` lists are sorted
// before comparing, as tests/utils/unorderedSchema.ts does for specs. Every other list keeps its order.
const byJson = (a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
const unordered = (value, parent, key) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const items = value.map(item => unordered(item, value));
    const union = (key === 'types' && ['union', 'intersection'].includes(parent?.dataType)) || key === 'enums' || key === 'required';
    return union ? items.sort(byJson) : items;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(name => [name, unordered(value[name], value, name)]),
  );
};

const run = (command, args, options) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options });
// Through a shell, because npm on Windows is npm.cmd.
const npm = (args, cwd) => execSync(`npm ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

const project = mkdtempSync(join(tmpdir(), 'tsoa-installed-helper-'));
try {
  const tarballs = join(project, 'tarballs');
  mkdirSync(tarballs);
  for (const workspace of ['runtime', 'cli']) npm(`pack --silent --pack-destination "${tarballs}"`, join(repo, 'packages', workspace));
  const helperTarballs = helper
    ? readdirSync(resolve(tarballArg))
        .filter(file => file.startsWith(`tsoa-compiler-helper-${helper}-`) && file.endsWith('.tgz'))
        .map(file => join(resolve(tarballArg), file))
    : [];
  if (helper && helperTarballs.length < 2) throw new Error(`want the umbrella and a platform tarball for ${helper} in ${tarballArg}, found ${helperTarballs.join(', ') || 'none'}`);

  writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'tsoa-installed-helper-check', private: true }, null, 2));
  mkdirSync(join(project, 'src'));
  writeFileSync(join(project, 'src', 'widgetController.ts'), controller);
  const packages = [...readdirSync(tarballs).map(file => join(tarballs, file)), ...helperTarballs, compilerSpec];
  npm(`install --no-audit --no-fund --save-dev ${packages.map(name => `"${name}"`).join(' ')}`, project);

  const entry = join(project, 'src', 'widgetController.ts');
  const env = { ...process.env, TSOA_COMPILER_HELPER: '' };
  const installed = JSON.parse(run(process.execPath, ['-e', generate, join(project, 'node_modules', '@tsoa', 'cli'), entry], { cwd: project, env }));
  const reference = JSON.parse(run(process.execPath, ['-e', generate, join(repo, 'packages', 'cli'), entry], { cwd: repo, env }));

  console.log(`${compilerSpec}: chose ${JSON.stringify(installed.choice)}, native program loaded: ${installed.nativeLoaded}`);
  if (reference.choice.kind !== 'typescript') throw new Error(`the reference run in ${repo} did not use TypeScript 6: ${JSON.stringify(reference.choice)}`);
  // Matched as a part of the path: the resolved path may spell the temporary directory differently (macOS /private/var).
  const wantHelperPath = helper && join('node_modules', '@tsoa', `compiler-helper-${helper}-${process.platform}-${process.arch}`, 'bin');
  if (
    helper ? installed.choice.kind !== 'helper' || !installed.choice.helperPath.includes(wantHelperPath) || !installed.nativeLoaded : installed.choice.kind !== 'typescript' || installed.nativeLoaded
  ) {
    throw new Error(`want ${helper ? `the ${helper} helper under ${wantHelperPath}` : 'TypeScript itself, with no native code loaded'}`);
  }
  const [a, b] = [JSON.stringify(unordered(installed.metadata), null, 2), JSON.stringify(unordered(reference.metadata), null, 2)];
  if (a !== b) {
    writeFileSync(join(tmpdir(), 'tsoa-installed-metadata.json'), a);
    writeFileSync(join(tmpdir(), 'tsoa-reference-metadata.json'), b);
    throw new Error(`metadata differs from TypeScript 6's; both written to ${tmpdir()}`);
  }
  console.log(
    `${compilerSpec}: metadata equals TypeScript 6's up to union order (${a.length} bytes, ${installed.metadata.controllers.length} controller, ${Object.keys(installed.metadata.referenceTypeMap).length} reference types)`,
  );
} finally {
  rmSync(project, { recursive: true, force: true });
}
