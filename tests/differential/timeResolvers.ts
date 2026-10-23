/* eslint-disable no-console */
// Times metadata generation over every differential entry with both resolvers.
// Usage (from tests/): yarn time:resolvers [--runs N] [--budget 1.2]
import { performance } from 'node:perf_hooks';
import type { TypeResolverMode } from '@tsoa/cli/metadataGeneration/typeResolverMode';
import { fixtureEntries, generate } from './diffResolvers';

function option(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  return index >= 0 ? Number(process.argv[index + 1]) : fallback;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function totalMs(mode: TypeResolverMode, entries: string[]): number {
  const start = performance.now();
  for (const entry of entries) {
    generate(entry, mode);
  }
  return performance.now() - start;
}

function main() {
  const runs = option('--runs', 5);
  const budget = option('--budget', 1.2);
  const entries = fixtureEntries();
  const samples: Record<TypeResolverMode, number[]> = { legacy: [], checker: [] };
  for (let run = 0; run < runs; run++) {
    // Alternate the order so neither mode always runs on a warmer process.
    for (const mode of (run % 2 ? ['checker', 'legacy'] : ['legacy', 'checker']) as TypeResolverMode[]) {
      samples[mode].push(totalMs(mode, entries));
    }
  }
  const legacy = median(samples.legacy);
  const checker = median(samples.checker);
  const ratio = checker / legacy;
  console.log(`${entries.length} entries, ${runs} runs: legacy ${legacy.toFixed(0)}ms, checker ${checker.toFixed(0)}ms (median), ratio ${ratio.toFixed(2)} (budget ${budget})`);
  process.exitCode = ratio > budget ? 1 : 0;
}

main();
