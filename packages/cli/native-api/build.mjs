// Builds TypeScript 7's compiler with tsoa's API extensions (prototype).
//
// The compiler's API answers each checker query in a request of its own, and its printed type nodes have no
// symbols. The extensions in ./go add API methods that answer what tsoa needs in fewer requests, or at all. This
// script checks out the pinned compiler revision, adds them as files of the API package, applies session.patch
// (which routes unknown methods to them) and builds the compiler's own `tsc` command. The API client starts it
// with `new API({ tsserverPath })`.
//
// Usage: node native-api/build.mjs [--output <path>]
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The v7.1-beta tag, matching typescript@7.1.0-beta.
const compilerRepository = 'https://github.com/microsoft/TypeScript.git';
const compilerRevision = '3e9236361fa97a9e6c685f4833ac457ae2d8c50a';
const goToolchain = 'go1.27.0';

const dir = dirname(fileURLToPath(import.meta.url));
const upstreamDir = join(dir, 'upstream');
const outputIndex = process.argv.indexOf('--output');
const output = outputIndex > 0 ? process.argv[outputIndex + 1] : join(dir, 'bin', process.platform === 'win32' ? 'tsc.exe' : 'tsc');
const git = (...args) => execFileSync('git', args, { cwd: upstreamDir, stdio: 'inherit' });

if (!existsSync(join(upstreamDir, '.git'))) {
  mkdirSync(upstreamDir, { recursive: true });
  git('init', '-q');
  git('remote', 'add', 'origin', compilerRepository);
  git('sparse-checkout', 'set', 'tsc');
  git('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', compilerRevision);
}
// Start from the pinned revision without earlier extensions or patches.
git('checkout', '-q', '--force', compilerRevision);
git('clean', '-q', '-fd', 'tsc');
for (const file of readdirSync(join(dir, 'go'))) {
  cpSync(join(dir, 'go', file), join(upstreamDir, 'tsc', 'internal', 'api', file));
}
git('apply', join(dir, 'session.patch'));

mkdirSync(dirname(output), { recursive: true });
execFileSync('go', ['build', '-trimpath', '-o', output, './cmd/tsc'], {
  cwd: join(upstreamDir, 'tsc'),
  stdio: 'inherit',
  env: { ...process.env, GOWORK: 'off', GOTOOLCHAIN: goToolchain },
});
console.log(`Built ${output}`);
