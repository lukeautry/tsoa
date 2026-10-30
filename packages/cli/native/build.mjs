// Builds the native metadata generator: tsoa's Go sources compiled into the TypeScript 7 compiler.
//
// The compiler keeps its checker in internal Go packages, which only code inside its own module may import.
// So this script checks out a pinned compiler revision, places the sources of ./go into it as
// `tsc/cmd/tsoa-metadata`, and builds that command. Requires git and Go (the toolchain the compiler asks for is
// downloaded by Go itself).
//
// A build for a platform goes to its package, packages/cli-native/<platform>-<arch>, which @tsoa/cli lists as an
// optional dependency. Go cross-compiles, so one machine builds all of them.
//
// Usage: node native/build.mjs [--target <platform>-<arch>]... [--all] [--output <path>]
//   no target: the platform this runs on; --output: a single build, to the given path.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The compiler revision the native generator is built against: the v7.1-beta tag, matching typescript@7.1.0-beta.
const compilerRepository = 'https://github.com/microsoft/TypeScript.git';
const compilerRevision = '3e9236361fa97a9e6c685f4833ac457ae2d8c50a';
const goToolchain = 'go1.27.0';

// The platforms tsoa ships a native generator for, by Node's names, with Go's names for them.
const targets = {
  'linux-x64': { goos: 'linux', goarch: 'amd64' },
  'linux-arm64': { goos: 'linux', goarch: 'arm64' },
  'darwin-x64': { goos: 'darwin', goarch: 'amd64' },
  'darwin-arm64': { goos: 'darwin', goarch: 'arm64' },
  'win32-x64': { goos: 'windows', goarch: 'amd64' },
  'win32-arm64': { goos: 'windows', goarch: 'arm64' },
};

const nativeDir = dirname(fileURLToPath(import.meta.url));
const upstreamDir = join(nativeDir, 'upstream');
const platformPackagesDir = join(nativeDir, '..', '..', 'cli-native');

const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const requested = args.includes('--all') ? Object.keys(targets) : args.flatMap((arg, index) => (args[index - 1] === '--target' ? [arg] : []));
const builds = (requested.length ? requested : [`${process.platform}-${process.arch}`]).map(target => {
  if (!targets[target]) {
    throw new Error(`Unknown target ${target}; known targets: ${Object.keys(targets).join(', ')}`);
  }
  const binary = target.startsWith('win32-') ? 'tsoa-metadata.exe' : 'tsoa-metadata';
  return { target, ...targets[target], output: join(platformPackagesDir, target, 'bin', binary) };
});
if (option('--output')) {
  if (builds.length !== 1) {
    throw new Error('--output takes a single target');
  }
  builds[0].output = option('--output');
}

const git = (...args) => execFileSync('git', args, { cwd: upstreamDir, stdio: 'inherit' });

if (!existsSync(join(upstreamDir, '.git'))) {
  mkdirSync(upstreamDir, { recursive: true });
  git('init', '-q');
  git('remote', 'add', 'origin', compilerRepository);
  git('sparse-checkout', 'set', 'tsc');
}
const head = existsSync(join(upstreamDir, 'tsc')) ? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: upstreamDir, encoding: 'utf8' }).trim() : '';
if (head !== compilerRevision) {
  git('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', compilerRevision);
  git('checkout', '-q', '--force', 'FETCH_HEAD');
}

const commandDir = join(upstreamDir, 'tsc', 'cmd', 'tsoa-metadata');
rmSync(commandDir, { recursive: true, force: true });
cpSync(join(nativeDir, 'go'), commandDir, { recursive: true, filter: source => !source.endsWith(join('go', 'checker')) });
// Accessors added to the checker package, in files of their own.
cpSync(join(nativeDir, 'go', 'checker'), join(upstreamDir, 'tsc', 'internal', 'checker'), { recursive: true });

for (const { target, goos, goarch, output } of builds) {
  mkdirSync(dirname(output), { recursive: true });
  execFileSync('go', ['build', '-trimpath', '-ldflags=-s -w', '-o', output, './cmd/tsoa-metadata'], {
    cwd: join(upstreamDir, 'tsc'),
    stdio: 'inherit',
    // The compiler's go.work lists modules outside the sparse checkout.
    env: { ...process.env, GOWORK: 'off', GOTOOLCHAIN: goToolchain, GOOS: goos, GOARCH: goarch, CGO_ENABLED: '0' },
  });
  // The binary is TypeScript's compiler with tsoa's generator in it: TypeScript's license and notices ship with it.
  for (const file of ['LICENSE.txt', 'NOTICE.txt']) {
    cpSync(join(upstreamDir, file), join(dirname(output), `TypeScript-${file}`));
  }
  console.log(`Built ${target}: ${output}`);
}
