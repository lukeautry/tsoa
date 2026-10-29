// Builds the native metadata generator: tsoa's Go sources compiled into the TypeScript 7 compiler.
//
// The compiler keeps its checker in internal Go packages, which only code inside its own module may import.
// So this script checks out a pinned compiler revision, places the sources of ./go into it as
// `tsc/cmd/tsoa-metadata`, and builds that command. Requires git and Go (the toolchain the compiler asks for is
// downloaded by Go itself).
//
// Usage: node native/build.mjs [--output <path>]
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The compiler revision the native generator is built against: the v7.1-beta tag, matching typescript@7.1.0-beta.
const compilerRepository = 'https://github.com/microsoft/TypeScript.git';
const compilerRevision = '3e9236361fa97a9e6c685f4833ac457ae2d8c50a';
const goToolchain = 'go1.27.0';

const nativeDir = dirname(fileURLToPath(import.meta.url));
const upstreamDir = join(nativeDir, 'upstream');
const outputIndex = process.argv.indexOf('--output');
const output = outputIndex > 0 ? process.argv[outputIndex + 1] : join(nativeDir, 'bin', process.platform === 'win32' ? 'tsoa-metadata.exe' : 'tsoa-metadata');

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

mkdirSync(dirname(output), { recursive: true });
execFileSync('go', ['build', '-trimpath', '-o', output, './cmd/tsoa-metadata'], {
  cwd: join(upstreamDir, 'tsc'),
  stdio: 'inherit',
  // The compiler's go.work lists modules outside the sparse checkout.
  env: { ...process.env, GOWORK: 'off', GOTOOLCHAIN: goToolchain },
});
console.log(`Built ${output}`);
