import { Tsoa } from '@tsoa/runtime';
import isISO8601 from 'validator/lib/isISO8601';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { CompilerOptions } from '../compilerOptions';
import { GenerateMetadataError } from './exceptions';

export interface NativeMetadataRequest {
  currentDirectory: string;
  rootFiles: string[];
  compilerOptions: CompilerOptions;
  ignorePaths?: string[];
  rootSecurity: Tsoa.Security[];
  defaultNumberType: string;
}

// A validation that depends on JavaScript semantics, which the native generator leaves to this side.
type NativeCheck = { kind: 'pattern'; value: string; location: string } | { kind: 'isoDate'; name: string; value: string } | { kind: 'json'; value: string; suffix: string };

interface NativeMetadataResponse {
  metadata?: Tsoa.Metadata;
  error?: string;
  warnings?: string[];
  checks?: NativeCheck[];
}

const binaryName = process.platform === 'win32' ? 'tsoa-metadata.exe' : 'tsoa-metadata';

/**
 * The native generator: `TSOA_NATIVE_BINARY` if set, else the one of the platform package
 * (`@tsoa/cli-<platform>-<arch>`, an optional dependency), else, in the tsoa repository, the one `native/build.mjs`
 * built into that package's directory.
 */
export function nativeMetadataBinary(): string {
  if (process.env.TSOA_NATIVE_BINARY) {
    return process.env.TSOA_NATIVE_BINARY;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { name } = require('../../package.json') as { name: string };
  const target = `${process.platform}-${process.arch}`;
  const platformPackage = `${name}-${target}`;
  try {
    return join(dirname(require.resolve(`${platformPackage}/package.json`)), 'bin', binaryName);
  } catch {
    const built = join(__dirname, '..', '..', '..', 'cli-native', target, 'bin', binaryName);
    if (existsSync(built)) {
      return built;
    }
    throw new Error(
      `tsoa has no native generator for ${process.platform}-${process.arch}: the package ${platformPackage} is not installed. Install it, or build it with \`node native/build.mjs\` in the tsoa repository.`,
    );
  }
}

function runNative<T>(request: object): T {
  const result = spawnSync(nativeMetadataBinary(), [], { input: JSON.stringify(request), maxBuffer: 1024 * 1024 * 1024, encoding: 'utf8' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`The native metadata generator failed: ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as T;
}

/** The compiler options of a tsconfig.json file, as the compiler reads it; errors are thrown formatted the way `tsc` prints them. */
export function parseConfigFile(configFile: string, currentDirectory: string): CompilerOptions {
  const response = runNative<{ options?: CompilerOptions; errors?: string }>({ command: 'parseConfig', configFile, currentDirectory });
  if (response.errors !== undefined || !response.options) {
    throw new Error(response.errors);
  }
  return response.options;
}

export function generateNativeMetadata(request: NativeMetadataRequest): Tsoa.Metadata {
  const response = runNative<NativeMetadataResponse>(request);
  for (const warning of response.warnings ?? []) {
    console.warn(warning);
  }
  // Checks precede the error of the generation: the generator ran them first.
  for (const check of response.checks ?? []) {
    runCheck(check);
  }
  if (response.error !== undefined || !response.metadata) {
    throw new GenerateMetadataError(response.error);
  }
  return linkReferenceTypes(response.metadata);
}

function runCheck(check: NativeCheck) {
  if (check.kind === 'pattern') {
    try {
      new RegExp(check.value);
    } catch (error) {
      if (error instanceof SyntaxError) {
        const message = `Invalid @pattern ${JSON.stringify(check.value)}. ${error.message}`;
        const failure = new GenerateMetadataError(message);
        failure.message = `${message}\n${check.location}`;
        throw failure;
      }
      throw error;
    }
  } else if (check.kind === 'json') {
    try {
      JSON.parse(check.value);
    } catch (error) {
      throw new GenerateMetadataError(`JSON format is incorrect: ${error instanceof Error ? error.message : String(error)}${check.suffix}`);
    }
  } else if (!isISO8601(check.value, { strict: true })) {
    throw new GenerateMetadataError(`${check.name} parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z`);
  }
}

// `new Date(...)` initializers are evaluated here, with JavaScript's Date.
function dateValue(marker: { $tsoaDate: unknown[]; dateOnly: boolean }): string {
  const date = marker.$tsoaDate.length > 0 ? new Date(marker.$tsoaDate as never) : new Date();
  const dateString = date.toISOString();
  return marker.dateOnly ? dateString.split('T')[0] : dateString;
}

// Reference types are written once, in the reference type map, and as `{ $tsoaRef: refName }` elsewhere. Linking
// them makes every use of a reference type the object of the map, as a generator in JavaScript would build it.
function linkReferenceTypes(metadata: Tsoa.Metadata): Tsoa.Metadata {
  const map = metadata.referenceTypeMap;
  const link = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        value[index] = link(value[index]);
      }
      return value;
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.$tsoaRef === 'string') {
        return map[record.$tsoaRef];
      }
      if (record.$tsoaUndefined === true) {
        return undefined;
      }
      if (Array.isArray(record.$tsoaDate)) {
        return dateValue(record as { $tsoaDate: unknown[]; dateOnly: boolean });
      }
      for (const key of Object.keys(record)) {
        record[key] = link(record[key]);
      }
    }
    return value;
  };
  for (const name of Object.keys(map)) {
    link(map[name]);
  }
  link(metadata.controllers);
  return metadata;
}
