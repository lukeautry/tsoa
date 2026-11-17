#!/usr/bin/env node
// Builds a compiler helper from the pinned TypeScript 7 compiler it links against. Idempotent.
// Usage: node build.mjs <go|rs> [output path]   (default: <go|rs>/bin/helper, helper.exe for a Windows target)
// go: GOOS/GOARCH cross-compile. rs: PROFILE=dev builds unoptimized, TARGET=<triple> cross-compiles.
import { execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const here = import.meta.dirname;
const [helper, outputArg] = process.argv.slice(2);
const builds = { go: buildGo, rs: buildRs };
if (!builds[helper]) {
  console.error('usage: node build.mjs <go|rs> [output path]');
  process.exit(1);
}

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', ...options });
  } catch (error) {
    if (error.code === 'ENOENT') console.error(`${command} is not on PATH (see README.md)`);
    process.exit(typeof error.status === 'number' ? error.status : 1);
  }
}

function outputPath(windowsTarget) {
  return resolve(outputArg ?? join(here, helper, 'bin', windowsTarget ? 'helper.exe' : 'helper'));
}

function isOlder(have, wanted) {
  const parts = version =>
    version
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map(Number);
  const [a, b] = [parts(have), parts(wanted)];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

// ./go/src goes into a sparse checkout of tsgo as tsc/cmd/tsoa-facts, plus one accessor file in tsc/internal/checker.
function buildGo() {
  const revision = '3e9236361fa97a9e6c685f4833ac457ae2d8c50a';
  const upstream = join(here, 'go', 'upstream');
  const env = { ...process.env, GOTOOLCHAIN: 'local', GOWORK: 'off', CGO_ENABLED: '0' };
  const have = run('go', ['env', 'GOVERSION'], { env }).trim().replace(/^go/, '');

  if (!existsSync(join(upstream, '.git'))) {
    mkdirSync(upstream, { recursive: true });
    run('git', ['-C', upstream, 'init', '-q']);
    run('git', ['-C', upstream, 'remote', 'add', 'origin', 'https://github.com/microsoft/TypeScript.git']);
    run('git', ['-C', upstream, 'sparse-checkout', 'set', 'tsc']);
  }
  let head = '';
  try {
    head = execFileSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
  } catch {}
  if (head !== revision) {
    run('git', ['-C', upstream, 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', revision]);
    run('git', ['-C', upstream, 'checkout', '-q', '--force', 'FETCH_HEAD']);
  }

  const wanted = readFileSync(join(upstream, 'tsc', 'go.mod'), 'utf8').match(/^go\s+(\S+)/m)[1];
  if (isOlder(have, wanted)) {
    console.error(`go ${have} is older than go ${wanted}, which tsc/go.mod at ${revision} requires`);
    process.exit(1);
  }

  const command = join(upstream, 'tsc', 'cmd', 'tsoa-facts');
  rmSync(command, { recursive: true, force: true });
  mkdirSync(command, { recursive: true });
  const copyGoFiles = (from, to) => {
    for (const file of readdirSync(from).filter(name => name.endsWith('.go'))) copyFileSync(join(from, file), join(to, file));
  };
  copyGoFiles(join(here, 'go', 'src'), command);
  copyGoFiles(join(here, 'go', 'src', 'checker'), join(upstream, 'tsc', 'internal', 'checker'));

  const output = outputPath(env.GOOS ? env.GOOS === 'windows' : process.platform === 'win32');
  mkdirSync(dirname(output), { recursive: true });
  run('go', ['build', '-trimpath', '-ldflags=-s -w', '-o', output, './cmd/tsoa-facts'], { cwd: join(upstream, 'tsc'), env, stdio: 'inherit' });
  console.log(`built ${output}`);
}

// tsrs is cloned at the pin into ./rs/tsrs, gets the accessor file in its checker crate and the helper crate.
function buildRs() {
  const tag = 'v0.25.0';
  const revision = '0f82b670e4ff861840b1315f8610816229e73e3a';
  const profile = process.env.PROFILE || 'release';
  const target = process.env.TARGET || '';
  const rs = join(here, 'rs');
  const tsrs = join(rs, 'tsrs');
  run('cargo', ['--version']);

  if (!existsSync(join(tsrs, '.git'))) {
    run('git', ['clone', '--quiet', '--depth', '1', '--branch', tag, 'https://github.com/oxc-project/tsrs.git', tsrs]);
  }
  const actual = run('git', ['-C', tsrs, 'rev-parse', 'HEAD']).trim();
  if (actual !== revision) {
    console.error(`tsrs is at ${actual}, want ${revision}`);
    process.exit(1);
  }

  const checker = join(tsrs, 'crates', 'tsrs_checker', 'src');
  copyFileSync(join(rs, 'tsrs-patch', 'tsoa_exports.rs'), join(checker, 'tsoa_exports.rs'));
  const lib = join(checker, 'lib.rs');
  if (!readFileSync(lib, 'utf8').split(/\r?\n/).includes('mod tsoa_exports;')) appendFileSync(lib, 'mod tsoa_exports;\n');

  const crate = join(tsrs, 'crates', 'tsoa_facts');
  rmSync(crate, { recursive: true, force: true });
  cpSync(join(rs, 'tsoa_facts'), crate, { recursive: true });

  run('cargo', ['build', '--profile', profile, ...(target ? ['--target', target] : []), '-p', 'tsoa_facts'], { cwd: tsrs, stdio: 'inherit' });
  const windows = target ? target.includes('windows') : process.platform === 'win32';
  const built = join(tsrs, 'target', target, profile === 'dev' ? 'debug' : profile, windows ? 'tsoa-facts.exe' : 'tsoa-facts');
  const output = outputPath(windows);
  mkdirSync(dirname(output), { recursive: true });
  copyFileSync(built, output);
  console.log(`built ${output} (${profile}${target ? `, ${target}` : ''})`);
}

builds[helper]();
