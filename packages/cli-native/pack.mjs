#!/usr/bin/env node
// Builds a compiler helper's platform packages from binaries that build.mjs wrote, each next to the upstream LICENSE and NOTICE.
//   node pack.mjs <tsgo|tsrs> <output directory> [<os>-<cpu>=<binary path> ...]
//     Packs the umbrella package, listing the given platforms, and one platform package per binary into tarballs.
//   node pack.mjs <tsgo|tsrs> --publish
//     The umbrella's prepublishOnly under `lerna publish`. Takes every platform's binary from
//     $TSOA_HELPER_BINARIES/<tsgo|tsrs>/<os>-<cpu>/, publishes each platform package that is not on the registry yet,
//     then writes them into the umbrella's optionalDependencies, so that lerna packs and publishes the umbrella with them.
//     lerna hands its command line options to no lifecycle script, so the npm settings both read come from the environment
//     or the npm config files: NPM_CONFIG_TAG (default latest), NPM_CONFIG_DRY_RUN, NPM_CONFIG_PROVENANCE, the registry.
import { execSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const platforms = ['linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64', 'win32-x64'];
const here = import.meta.dirname;
const [compiler, outputArg, ...binaryArgs] = process.argv.slice(2);
if (!['tsgo', 'tsrs'].includes(compiler) || !outputArg) {
  console.error('usage: node pack.mjs <tsgo|tsrs> <output directory> [<os>-<cpu>=<binary path> ...]\n       node pack.mjs <tsgo|tsrs> --publish');
  process.exit(1);
}

const umbrellaDirectory = resolve(here, '..', `compiler-helper-${compiler}`);
const umbrellaManifest = join(umbrellaDirectory, 'package.json');
const umbrella = JSON.parse(readFileSync(umbrellaManifest, 'utf8'));
const executable = platform => (platform.startsWith('win32-') ? 'helper.exe' : 'helper');
const optionalDependencies = names => Object.fromEntries(names.map(platform => [`${umbrella.name}-${platform}`, umbrella.version]));
// Through a shell, because npm on Windows is npm.cmd.
const npm = (args, cwd) => execSync(`npm ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

/** A staging directory holding the platform package for `binary`, which has the upstream LICENSE and NOTICE beside it. */
function stagePlatformPackage(platform, binary) {
  const [os, cpu] = platform.split('-');
  const upstreamFiles = ['LICENSE', 'NOTICE'].map(name => join(binary, '..', name));
  const missing = [binary, ...upstreamFiles].filter(file => !existsSync(file));
  if (missing.length) throw new Error(`missing ${missing.join(', ')}: build.mjs writes the helper with the upstream LICENSE and NOTICE beside it`);

  const staging = mkdtempSync(join(tmpdir(), `tsoa-compiler-helper-${compiler}-${platform}-`));
  mkdirSync(join(staging, 'bin'));
  copyFileSync(binary, join(staging, 'bin', executable(platform)));
  chmodSync(join(staging, 'bin', executable(platform)), 0o755);
  for (const file of upstreamFiles) copyFileSync(file, join(staging, `UPSTREAM-${file.split(/[\\/]/).pop()}`));
  const packageJson = {
    name: `${umbrella.name}-${platform}`,
    version: umbrella.version,
    description: `The ${platform} binary of ${umbrella.name}`,
    license: 'MIT AND Apache-2.0',
    repository: umbrella.repository,
    files: ['bin', 'UPSTREAM-LICENSE', 'UPSTREAM-NOTICE'],
    os: [os],
    cpu: [cpu],
    // The Rust helper links the build machine's glibc on Linux; the Go helper is static.
    ...(compiler === 'tsrs' && os === 'linux' ? { libc: ['glibc'] } : {}),
    publishConfig: { access: 'public' },
    tsoaCompilerHelper: umbrella.tsoaCompilerHelper,
  };
  writeFileSync(join(staging, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
  return staging;
}

function pack() {
  const output = resolve(outputArg);
  mkdirSync(output, { recursive: true });
  const binaries = binaryArgs.map(argument => {
    const [platform, binary] = argument.split('=');
    if (!platforms.includes(platform) || !binary) throw new Error(`${argument}: want <os>-<cpu>=<binary>, with <os>-<cpu> one of ${platforms.join(', ')}`);
    return [platform, resolve(binary)];
  });
  const packInto = directory => console.log(`packed ${join(output, npm(`pack --silent --pack-destination "${output}"`, directory).split(/\r?\n/).pop())}`);

  const umbrellaStaging = mkdtempSync(join(tmpdir(), `tsoa-compiler-helper-${compiler}-`));
  try {
    cpSync(umbrellaDirectory, umbrellaStaging, { recursive: true });
    writeFileSync(join(umbrellaStaging, 'package.json'), JSON.stringify({ ...umbrella, optionalDependencies: optionalDependencies(binaries.map(([platform]) => platform)) }, null, 2) + '\n');
    packInto(umbrellaStaging);
  } finally {
    rmSync(umbrellaStaging, { recursive: true, force: true });
  }
  for (const [platform, binary] of binaries) {
    const staging = stagePlatformPackage(platform, binary);
    try {
      packInto(staging);
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
  }
}

function publish() {
  const binariesDirectory = process.env.TSOA_HELPER_BINARIES;
  const binaries = platforms.map(platform => [platform, binariesDirectory ? resolve(binariesDirectory, compiler, platform, executable(platform)) : '']);
  const missing = binaries.filter(([, binary]) => !binary || !existsSync(binary)).map(([platform]) => platform);
  if (missing.length) {
    throw new Error(
      `${umbrella.name} needs a binary for every platform before it is published, and has none for ${missing.join(', ')}` +
        `${binariesDirectory ? ` in ${resolve(binariesDirectory, compiler)}` : ' (TSOA_HELPER_BINARIES is not set)'}. ` +
        'Releases run in CI: .github/workflows/release.yml builds the binaries and runs the lerna release (see RELEASING.md). ' +
        'To release from here, merge the helper-binaries-* artifacts of a release.yml run into one directory, ' +
        'so that it holds <tsgo|tsrs>/<os>-<cpu>/helper[.exe] with LICENSE and NOTICE, and set TSOA_HELPER_BINARIES=<dir>.',
    );
  }

  // npm reads its environment case-insensitively, as lerna does.
  const npmConfig = name => Object.entries(process.env).find(([key, value]) => key.toLowerCase() === `npm_config_${name}` && value)?.[1];
  const tag = npmConfig('tag') || 'latest';
  const dryRun = ['true', '1'].includes(npmConfig('dry_run'));
  // Under `yarn deploy`, yarn hands its registry proxy to every script, and lerna publishes to npm's registry instead.
  const registry = /registry\.yarnpkg\.com/.test(npmConfig('registry') ?? '') ? ' --registry https://registry.npmjs.org/' : '';
  for (const [platform, binary] of binaries) {
    const spec = `${umbrella.name}-${platform}@${umbrella.version}`;
    let published = '';
    try {
      published = npm(`view "${spec}" version${registry}`, umbrellaDirectory);
    } catch {}
    if (published === umbrella.version) {
      console.log(`${spec} is already published, skipping it`);
      continue;
    }
    const staging = stagePlatformPackage(platform, binary);
    try {
      // --tag always: npm refuses a prerelease version without one, and lerna publishes every package with this tag.
      execSync(`npm publish --tag "${tag}"${registry}${dryRun ? ' --dry-run' : ''}`, { cwd: staging, stdio: 'inherit' });
      console.log(`${dryRun ? 'dry run, did not publish' : 'published'} ${spec} with tag ${tag}`);
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
  }

  const manifest = JSON.parse(readFileSync(umbrellaManifest, 'utf8'));
  writeFileSync(umbrellaManifest, JSON.stringify({ ...manifest, optionalDependencies: optionalDependencies(platforms) }, null, 2) + '\n');
  console.log(`wrote ${platforms.length} optionalDependencies at ${umbrella.version} into ${umbrellaManifest}`);
}

try {
  if (outputArg === '--publish') publish();
  else pack();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
