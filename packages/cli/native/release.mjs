// Prepares the native generator for a release of @tsoa/cli.
//
// Each platform's binary ships in a package of its own, packages/cli-native/<platform>-<arch>, which npm installs
// only on that platform (its `os` and `cpu` fields). @tsoa/cli lists them as optional dependencies, but only in
// the package it publishes: they cannot be dependencies inside the repository, where Yarn 1 neither installs
// workspaces for another platform nor tolerates optional dependencies that are not published yet.
//
// This script gives every platform package the version of @tsoa/cli, checks that its binary is built
// (`node native/build.mjs --all`), and writes the optional dependencies into @tsoa/cli's package.json.
// With --publish it then publishes the platform packages (passing on --tag <tag>); @tsoa/cli is published after
// them, as usual.
//
// Usage: node native/release.mjs [--publish [--tag <tag>]]
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const nativeDir = dirname(fileURLToPath(import.meta.url));
const cliManifestPath = join(nativeDir, '..', 'package.json');
const platformPackagesDir = join(nativeDir, '..', '..', 'cli-native');

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const args = process.argv.slice(2);
const tagIndex = args.indexOf('--tag');
const tag = tagIndex >= 0 ? args[tagIndex + 1] : undefined;

const cli = readJson(cliManifestPath);
const optionalDependencies = {};
for (const target of readdirSync(platformPackagesDir, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
  const packageDir = join(platformPackagesDir, target.name);
  const manifestPath = join(packageDir, 'package.json');
  const manifest = readJson(manifestPath);
  const binary = join(packageDir, 'bin', target.name.startsWith('win32-') ? 'tsoa-metadata.exe' : 'tsoa-metadata');
  if (!existsSync(binary)) {
    throw new Error(`${binary} is missing: run \`node native/build.mjs --all\` first.`);
  }
  manifest.version = cli.version;
  writeJson(manifestPath, manifest);
  optionalDependencies[manifest.name] = cli.version;
  if (args.includes('--publish')) {
    execFileSync('npm', ['publish', ...(tag ? ['--tag', tag] : [])], { cwd: packageDir, stdio: 'inherit', shell: process.platform === 'win32' });
  }
}
cli.optionalDependencies = optionalDependencies;
writeJson(cliManifestPath, cli);
console.log(`${cli.name} ${cli.version} now depends on ${Object.keys(optionalDependencies).join(', ')}.`);
