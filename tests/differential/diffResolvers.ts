/* eslint-disable no-console */
// Generates metadata for every fixture entry point with both type resolvers and reports differences.
// Usage (from tests/): yarn diff:resolvers [--strict] [--filter <substring>]
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import type { TypeResolverMode } from '@tsoa/cli/metadataGeneration/typeResolverMode';
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { CompilerOptions } from 'typescript';
import { diffJson, isKnown, normalizeOutcome, type Outcome } from './diff';
import { knownDifferences } from './knownDifferences';

const testsDir = resolve(__dirname, '..');
const repoRoot = resolve(testsDir, '..');

export function fixtureEntries(): string[] {
  const inDir = (dir: string) =>
    existsSync(join(testsDir, dir))
      ? readdirSync(join(testsDir, dir))
          .filter(f => f.endsWith('.ts'))
          .map(f => `${dir}/${f}`)
      : [];
  const servers = readdirSync(join(testsDir, 'fixtures'))
    .map(d => `fixtures/${d}/server.ts`)
    .filter(f => existsSync(join(testsDir, f)));
  return [...inDir('fixtures/controllers'), ...inDir('fixtures/checker'), ...servers].sort();
}

export function generate(entry: string, mode: TypeResolverMode, compilerOptions?: CompilerOptions): Outcome {
  const { error, warn } = console;
  console.error = console.warn = () => undefined;
  try {
    const metadata = new MetadataGenerator(join(testsDir, entry), compilerOptions, undefined, undefined, [], 'double', false, mode).Generate();
    return normalizeOutcome({ metadata }, repoRoot);
  } catch (err) {
    return normalizeOutcome({ error: err }, repoRoot);
  } finally {
    console.error = error;
    console.warn = warn;
  }
}

const short = (value: unknown) => {
  const text = JSON.stringify(value) ?? 'undefined';
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

function main() {
  const args = process.argv.slice(2);
  const compilerOptions: CompilerOptions | undefined = args.includes('--strict') ? { strict: true } : undefined;
  const filterIndex = args.indexOf('--filter');
  const filter = filterIndex >= 0 ? args[filterIndex + 1] : undefined;
  const entries = fixtureEntries().filter(e => !filter || e.includes(filter));

  let differences = 0;
  let known = 0;
  for (const entry of entries) {
    const found = diffJson(generate(entry, 'legacy', compilerOptions), generate(entry, 'checker', compilerOptions));
    for (const d of found) {
      if (isKnown(knownDifferences, entry, d.path)) {
        known++;
        continue;
      }
      differences++;
      console.log(`${entry} ${d.path}: legacy=${short(d.legacy)} checker=${short(d.checker)}`);
    }
  }
  console.log(`${entries.length} entries, ${differences} differences, ${known} known${compilerOptions ? ' (strict)' : ''}`);
  process.exitCode = differences ? 1 : 0;
}

if (require.main === module) {
  main();
}
