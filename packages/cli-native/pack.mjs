#!/usr/bin/env node
// Packs a compiler helper's npm packages into tarballs: the umbrella package, plus one platform package per binary given.
// Usage: node pack.mjs <tsgo|tsrs> <output directory> [<os>-<cpu>=<binary path> ...]
// Example: node pack.mjs tsgo dist linux-x64=go/bin/helper win32-x64=go/bin/helper.exe
import { execSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const here = import.meta.dirname;
const [compiler, outputArg, ...binaries] = process.argv.slice(2);
const upstreamLicenses = {
  tsgo: [join(here, 'go', 'upstream', 'LICENSE.txt'), join(here, 'go', 'upstream', 'NOTICE.txt')],
  tsrs: [join(here, 'rs', 'tsrs', 'LICENSE'), join(here, 'rs', 'tsrs', 'NOTICE')],
};
if (!upstreamLicenses[compiler] || !outputArg) {
  console.error('usage: node pack.mjs <tsgo|tsrs> <output directory> [<os>-<cpu>=<binary path> ...]');
  process.exit(1);
}

const umbrellaDirectory = join(here, 'npm', `compiler-helper-${compiler}`);
const umbrella = JSON.parse(readFileSync(join(umbrellaDirectory, 'package.json'), 'utf8'));
const output = resolve(outputArg);
mkdirSync(output, { recursive: true });

// Through a shell, because npm on Windows is npm.cmd.
const npmPack = directory => {
  const file = execSync(`npm pack --silent --pack-destination "${output}"`, { cwd: directory, encoding: 'utf8' }).trim().split(/\r?\n/).pop();
  console.log(`packed ${join(output, file)}`);
};

npmPack(umbrellaDirectory);

for (const argument of binaries) {
  const [platform, binary] = argument.split('=');
  const name = `${umbrella.name}-${platform}`;
  if (!binary || umbrella.optionalDependencies?.[name] !== umbrella.version) {
    console.error(`${argument}: want <os>-<cpu>=<binary>, with ${name}@${umbrella.version} in ${umbrella.name}'s optionalDependencies`);
    process.exit(1);
  }
  const [os, cpu] = platform.split('-');
  const missing = upstreamLicenses[compiler].filter(file => !existsSync(file));
  if (missing.length) {
    console.error(`missing ${missing.join(', ')}: build the helper with build.mjs first, so its upstream checkout exists`);
    process.exit(1);
  }

  const staging = mkdtempSync(join(tmpdir(), 'tsoa-compiler-helper-'));
  try {
    const executable = os === 'win32' ? 'helper.exe' : 'helper';
    mkdirSync(join(staging, 'bin'));
    copyFileSync(binary, join(staging, 'bin', executable));
    chmodSync(join(staging, 'bin', executable), 0o755);
    const licenses = upstreamLicenses[compiler].map(file => {
      const target = `UPSTREAM-${file.split(/[\\/]/).pop()}`;
      copyFileSync(file, join(staging, target));
      return target;
    });
    const packageJson = {
      name,
      version: umbrella.version,
      description: `The ${platform} binary of ${umbrella.name}`,
      license: 'MIT AND Apache-2.0',
      repository: umbrella.repository,
      files: ['bin', ...licenses],
      os: [os],
      cpu: [cpu],
      // The Rust helper links the build machine's glibc on Linux; the Go helper is static.
      ...(compiler === 'tsrs' && os === 'linux' ? { libc: ['glibc'] } : {}),
      tsoaCompilerHelper: umbrella.tsoaCompilerHelper,
    };
    writeFileSync(join(staging, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
    npmPack(staging);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
