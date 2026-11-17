/**
 * Which compiler answers tsoa's type questions, chosen from the packages the project has installed:
 * typescript 5 or 6 is TypeScript's own program, typescript 7 is the tsgo helper, tsrs is the tsrs helper (and wins
 * over typescript 7). `TSOA_COMPILER_HELPER` overrides the choice.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

export type CompilerChoice = { kind: 'typescript' } | { kind: 'helper'; helperPath: string; description: string };

export interface InstalledPackage {
  version: string;
  directory: string;
  packageJson: { version: string; optionalDependencies?: Record<string, string>; tsoaCompilerHelper?: { typescriptVersion: string } };
}

/** The package `name` as Node resolves it from `fromDirectory`, or undefined when it is not installed. */
export type FindPackage = (name: string, fromDirectory: string) => InstalledPackage | undefined;

export interface CompilerSelectionInput {
  projectDirectory: string;
  override: string | undefined;
  platform: string;
  arch: string;
  findPackage: FindPackage;
}

const helperFor = {
  tsgo: { compiler: 'typescript', umbrella: '@tsoa/compiler-helper-tsgo' },
  tsrs: { compiler: 'tsrs', umbrella: '@tsoa/compiler-helper-tsrs' },
} as const;

/** TypeScript does not follow semver, so only the major counts. tsrs names the TypeScript it ports after `-ts`. */
function typescriptMajor(version: string): number {
  return Number(version.split('.')[0]);
}

function tsrsTypescriptVersion(tsrsVersion: string): string {
  const match = /-ts(\d.*)$/.exec(tsrsVersion);
  if (!match) throw new Error(`tsoa cannot tell which TypeScript version tsrs ${tsrsVersion} ports: its version has no "-ts<version>" part`);
  return match[1];
}

export function selectCompiler({ projectDirectory, override, platform, arch, findPackage }: CompilerSelectionInput): CompilerChoice {
  if (override) return { kind: 'helper', helperPath: override, description: `TSOA_COMPILER_HELPER=${override}` };

  const tsrs = findPackage('tsrs', projectDirectory);
  const typescript = findPackage('typescript', projectDirectory);
  let helper: keyof typeof helperFor;
  let found: string;
  let projectTypescriptVersion: string;
  if (tsrs) {
    helper = 'tsrs';
    found = `tsrs ${tsrs.version}`;
    projectTypescriptVersion = tsrsTypescriptVersion(tsrs.version);
  } else if (typescript && typescriptMajor(typescript.version) >= 7) {
    helper = 'tsgo';
    found = `typescript ${typescript.version}`;
    projectTypescriptVersion = typescript.version;
  } else if (typescript && typescriptMajor(typescript.version) >= 5) {
    return { kind: 'typescript' };
  } else {
    const what = typescript ? `typescript ${typescript.version}` : 'neither typescript nor tsrs';
    throw new Error(`tsoa found ${what} in ${projectDirectory}. tsoa needs TypeScript 5, 6 or 7, or tsrs. Install one, for example: npm install --save-dev typescript`);
  }

  const { umbrella } = helperFor[helper];
  const installed = findPackage(umbrella, projectDirectory);
  if (!installed) {
    throw new Error(`tsoa found ${found} in ${projectDirectory}, which needs the ${helper} compiler helper. Install it: npm install --save-dev ${umbrella}`);
  }

  const helperTypescriptVersion = installed.packageJson.tsoaCompilerHelper?.typescriptVersion ?? 'no recorded version';
  if (typescriptMajor(helperTypescriptVersion) !== typescriptMajor(projectTypescriptVersion)) {
    throw new Error(
      `tsoa found ${found}${helper === 'tsrs' ? `, which ports TypeScript ${projectTypescriptVersion}` : ''}, but ${umbrella} ${installed.version} is built for TypeScript ${helperTypescriptVersion}. ` +
        `A helper runs only on the TypeScript major it was built for. Install a version of ${umbrella} built for TypeScript ${typescriptMajor(projectTypescriptVersion)}, or a TypeScript ${typescriptMajor(helperTypescriptVersion)} compiler.`,
    );
  }

  const platformPackage = `${umbrella}-${platform}-${arch}`;
  const binaryPackage = findPackage(platformPackage, installed.directory);
  if (!binaryPackage) {
    const prefix = `${umbrella}-`;
    const platforms = Object.keys(installed.packageJson.optionalDependencies ?? {})
      .filter(name => name.startsWith(prefix))
      .map(name => name.slice(prefix.length));
    throw new Error(
      `${umbrella} ${installed.version} has no binary for ${platform}-${arch} (${platformPackage} is not installed). ` +
        `It has binaries for: ${platforms.join(', ') || 'none'}. If your platform is listed, reinstall without --no-optional or --omit=optional.`,
    );
  }

  return {
    kind: 'helper',
    helperPath: path.join(binaryPackage.directory, 'bin', platform === 'win32' ? 'helper.exe' : 'helper'),
    description: `${helper} helper ${umbrella} ${installed.version} (built from TypeScript ${helperTypescriptVersion}) for ${found}`,
  };
}

export const findInstalledPackage: FindPackage = (name, fromDirectory) => {
  let file: string;
  try {
    file = require.resolve(`${name}/package.json`, { paths: [fromDirectory] });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') return undefined;
    throw error;
  }
  const packageJson = JSON.parse(readFileSync(file, 'utf8')) as InstalledPackage['packageJson'];
  return { version: packageJson.version, directory: path.dirname(file), packageJson };
};
